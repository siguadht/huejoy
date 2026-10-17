import copy
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

import yaml

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.yaml"
CONFIG_EXAMPLE_PATH = BASE_DIR / "config.yaml.example"
SECRET_MASK = "********"
SECRET_PATHS = (
    "api_providers.openai.api_key",
    "api_providers.gemini.api_key",
    "api_providers.deepseek.api_key",
    "api_providers.dashscope.api_key",
    "api_providers.ark.api_key",
    "api_providers.kling.access_key",
    "api_providers.kling.secret_key",
    "api_providers.tokenplus.api_key",
    "api_providers.minimax.api_key",
)

# ---------- .env 支持：密钥与供应商配置的环境变量覆盖层 ----------
# 优先级：环境变量（含 .env）> backend/config.yaml。
# .env 是密钥的唯一真源；config.yaml 只保留非敏感配置，密钥位留空。
ENV_PATH = BASE_DIR / ".env"

# 环境变量前缀 → config.yaml 中 api_providers.<provider> 键
ENV_PROVIDER_PREFIXES: Dict[str, str] = {
    "OPENAI": "openai",
    "GEMINI": "gemini",
    "DEEPSEEK": "deepseek",
    "DASHSCOPE": "dashscope",
    "ARK": "ark",
    "KLING": "kling",
    "TOKENPLUS": "tokenplus",
    "MINIMAX": "minimax",
}

# 环境变量字段后缀 → provider 配置内的字段名
ENV_FIELD_SUFFIXES: Dict[str, str] = {
    "API_KEY": "api_key",
    "ACCESS_KEY": "access_key",
    "SECRET_KEY": "secret_key",
    "BASE_URL": "base_url",
    "ENABLE_PROXY": "enable_proxy",
}

# 本次进程中被环境变量覆盖的配置路径 → 对应的环境变量名（保存时回写/剥离用）
_ENV_OVERRIDES: Dict[str, str] = {}


def _load_dotenv(path: Path = ENV_PATH) -> Dict[str, str]:
    """极简 .env 解析：KEY=VALUE，支持 # 注释与成对引号；不引入第三方依赖。"""
    if not path.exists():
        return {}
    values: Dict[str, str] = {}
    with path.open("r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if not key:
                continue
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                value = value[1:-1]
            values[key] = value
    return values


def _sync_dotenv(updates: Dict[str, str], removals: Iterable[str] = ()) -> None:
    """把变更写回 .env 文件并同步进程环境（KEY 存在则替换，否则追加）。"""
    env = _load_dotenv()
    env.update(updates)
    for key in removals:
        env.pop(key, None)
    lines = [
        "# 雀跃 HueJoy 供应商密钥（.env 为密钥唯一真源，环境变量覆盖 config.yaml）",
        "# 命名规则：<供应商>_API_KEY / <供应商>_BASE_URL / <供应商>_ENABLE_PROXY；可灵用 ACCESS_KEY/SECRET_KEY",
    ]
    lines += [f"{k}={v}" for k, v in env.items() if not k.startswith("#")]
    ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    for key, value in env.items():
        if key.startswith("#"):
            continue
        os.environ[key] = value
    for key in removals:
        os.environ.pop(key, None)


def _apply_env_overrides(config: Dict[str, Any]) -> Dict[str, Any]:
    """环境变量覆盖 config.yaml 同名供应商配置（.env 与系统环境变量均生效，环境优先）。"""
    providers = config.get("api_providers")
    if not isinstance(providers, dict):
        return config
    for prefix, provider in ENV_PROVIDER_PREFIXES.items():
        provider_cfg = providers.get(provider)
        if not isinstance(provider_cfg, dict):
            continue
        for suffix, field in ENV_FIELD_SUFFIXES.items():
            var = f"{prefix}_{suffix}"
            raw = os.environ.get(var)
            if raw is None or raw == "":
                continue
            provider_cfg[field] = _as_bool(raw) if field == "enable_proxy" else raw
            _ENV_OVERRIDES[f"api_providers.{provider}.{field}"] = var
    return config


def _strip_env_overrides(values: Dict[str, Any]) -> Dict[str, Any]:
    """保存前剥离环境变量覆盖项：yaml 文件里只留非敏感配置，避免密钥二次落盘。"""
    clean = copy.deepcopy(values)
    for path in _ENV_OVERRIDES:
        _set(clean, path, False if path.endswith("enable_proxy") else "")
    return clean

DEFAULT_CONFIG: Dict[str, Any] = {
    "project_name": "XiaoYunQue",
    "server": {
        "host": "127.0.0.1",
        "port": 8000,
        "log_level": "INFO",
        "access_log": False,
    },
    "api_providers": {
        "common": {
            "print_model_input": False,
            "proxy": "",
        },
        "openai": {
            "api_key": "",
            "base_url": "https://api.openai.com/v1",
            "enable_proxy": False,
        },
        "gemini": {
            "api_key": "",
            "base_url": "https://generativelanguage.googleapis.com/v1beta",
            "enable_proxy": False,
        },
        "deepseek": {
            "api_key": "",
            "base_url": "https://api.deepseek.com/v1",
            "enable_proxy": False,
        },
        "dashscope": {
            "api_key": "",
            "base_url": "https://dashscope.aliyuncs.com/api/v1",
            "enable_proxy": False,
        },
        "ark": {
            "api_key": "",
            "base_url": "https://ark.cn-beijing.volces.com/api/v3",
            "enable_proxy": False,
        },
        "kling": {
            "base_url": "https://api-beijing.klingai.com",
            "access_key": "",
            "secret_key": "",
            "enable_proxy": False,
        },
    },
    "models": {
        "llm": "deepseek/deepseek-v4-flash",
        "vlm": "z-ai/glm-5.3-flash",
        "image_it2i": "MiniMax-image-01",
        "image_t2i": "MiniMax-image-01",
        "video": "MiniMax-H3",
        "video_first_frame": "MiniMax-H3",
        "video_start_end": "MiniMax-H3",
        "video_reference": "MiniMax-H3",
    },
    "generation": {
        "style": "realistic",
        "video_ratio": "16:9",
        "video_resolution": "720P",
        "video_generation_mode": "first_frame",
    },
}


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    merged = copy.deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def _get(data: Dict[str, Any], path: str, default: Any = None) -> Any:
    current: Any = data
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return default
        current = current[part]
    return current


def _set(data: Dict[str, Any], path: str, value: Any) -> None:
    current = data
    parts = path.split(".")
    for part in parts[:-1]:
        child = current.get(part)
        if not isinstance(child, dict):
            child = {}
            current[part] = child
        current = child
    current[parts[-1]] = value


def redact_config(values: Dict[str, Any]) -> Dict[str, Any]:
    public = copy.deepcopy(values)
    for path in SECRET_PATHS:
        _set(public, path, SECRET_MASK if _get(values, path) else "")
    return public


def merge_config_update(current: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(updates, dict):
        raise ValueError("Configuration update must be a mapping.")

    clean_updates = copy.deepcopy(updates)
    for path in SECRET_PATHS:
        if _get(clean_updates, path, None) == SECRET_MASK:
            _set(clean_updates, path, _get(current, path, ""))
    return _deep_merge(current, clean_updates)


def _coerce_config(data: Dict[str, Any]) -> Dict[str, Any]:
    clean = _deep_merge(DEFAULT_CONFIG, data)
    clean.pop("llm", None)
    raw_server = data.get("server", {}) if isinstance(data, dict) else {}

    legacy_models = data.get("models", {}) if isinstance(data, dict) else {}
    if isinstance(legacy_models, dict):
        for legacy_key in ("style", "video_ratio", "video_resolution"):
            # Legacy config compatibility: older config.yaml stored generation settings under models.*.
            if legacy_key in legacy_models and not _get(data, f"generation.{legacy_key}"):
                clean.setdefault("generation", {})[legacy_key] = legacy_models[legacy_key]
            clean["models"].pop(legacy_key, None)
        if legacy_models.get("video") and not any(
            legacy_models.get(key) for key in ("video_first_frame", "video_start_end", "video_reference")
        ):
            # Legacy config compatibility: older configs had one models.video instead of mode-specific video models.
            clean["models"]["video_first_frame"] = legacy_models["video"]
        # Legacy config compatibility: models.eval was never used by runtime agents; keep it out after load.
        clean["models"].pop("eval", None)

    server = clean["server"]
    server["host"] = str(server.get("host") or DEFAULT_CONFIG["server"]["host"])
    try:
        server["port"] = int(server.get("port"))
    except (TypeError, ValueError):
        server["port"] = DEFAULT_CONFIG["server"]["port"]
    server["log_level"] = _normalize_log_level(
        server.get("log_level") if isinstance(raw_server, dict) and "log_level" in raw_server else None,
        server.get("debug"),
    )
    server.pop("debug", None)
    server["access_log"] = _as_bool(server.get("access_log"))
    server.pop("admin_password", None)

    common = clean["api_providers"]["common"]
    for key in ("local_proxy", "http_proxy", "https_proxy"):
        common.pop(key, None)
    common["print_model_input"] = _as_bool(common.get("print_model_input"))
    common["proxy"] = str(common.get("proxy") or "")

    if isinstance(clean["models"].get("llm"), dict):
        clean["models"]["llm"] = clean["models"]["llm"].get("model") or DEFAULT_CONFIG["models"]["llm"]

    for key, value in clean["models"].items():
        if isinstance(value, dict):
            for sub_key, sub_value in value.items():
                value[sub_key] = "" if sub_value is None else str(sub_value)
        else:
            clean["models"][key] = "" if value is None else str(value)

    for key, value in clean["generation"].items():
        clean["generation"][key] = "" if value is None else str(value)

    for provider, values in clean["api_providers"].items():
        if provider == "common":
            continue
        for key, value in values.items():
            if key == "enable_proxy":
                values[key] = _as_bool(value)
            else:
                values[key] = "" if value is None else str(value)

    return clean


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _normalize_log_level(value: Any, legacy_debug: Any = None) -> str:
    allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
    if legacy_debug is not None and (value is None or str(value).strip() == ""):
        return "DEBUG" if _as_bool(legacy_debug) else "INFO"
    normalized = str(value or DEFAULT_CONFIG["server"]["log_level"]).strip().upper()
    return normalized if normalized in allowed else DEFAULT_CONFIG["server"]["log_level"]


def load_config() -> Dict[str, Any]:
    # .env 注入进程环境（不覆盖已有环境变量），使环境变量覆盖层生效
    for key, value in _load_dotenv().items():
        os.environ.setdefault(key, value)
    if not CONFIG_PATH.exists():
        source = CONFIG_EXAMPLE_PATH if CONFIG_EXAMPLE_PATH.exists() else None
        if source:
            with source.open("r", encoding="utf-8") as f:
                loaded = yaml.safe_load(f) or {}
            return _apply_env_overrides(_coerce_config(loaded))
        return _apply_env_overrides(copy.deepcopy(DEFAULT_CONFIG))

    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        loaded = yaml.safe_load(f) or {}
    if not isinstance(loaded, dict):
        raise ValueError("backend/config.yaml must contain a YAML mapping.")
    return _apply_env_overrides(_coerce_config(loaded))


def save_config(values: Dict[str, Any]) -> Dict[str, Any]:
    clean = _coerce_config(values)
    # 设置页若改了被 .env 托管的字段：写穿回 .env（密钥唯一真源仍是 .env）
    env_updates: Dict[str, str] = {}
    env_removals: list = []
    for path, var in _ENV_OVERRIDES.items():
        incoming = _get(clean, path, "")
        if incoming == "" or incoming == SECRET_MASK:
            if incoming == "" and os.environ.get(var):
                env_removals.append(var)
            continue
        if incoming != os.environ.get(var):
            env_updates[var] = str(incoming)
    if env_updates or env_removals:
        _sync_dotenv(env_updates, env_removals)
        _apply_env_overrides(clean)
    fd, temp_path = tempfile.mkstemp(dir=CONFIG_PATH.parent, prefix="config.", suffix=".yaml.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            yaml.safe_dump(_strip_env_overrides(clean), f, allow_unicode=True, sort_keys=False)
        os.replace(temp_path, CONFIG_PATH)
    except Exception:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise
    return clean


CONFIG_VALUES = load_config()


class Config:
    CONFIG = CONFIG_VALUES

    HOST = _get(CONFIG, "server.host")
    PORT = _get(CONFIG, "server.port")
    LOG_LEVEL = _get(CONFIG, "server.log_level")
    DEBUG = LOG_LEVEL == "DEBUG"
    ACCESS_LOG = _get(CONFIG, "server.access_log")

    PRINT_MODEL_INPUT = _get(CONFIG, "api_providers.common.print_model_input")
    PROXY = _get(CONFIG, "api_providers.common.proxy")

    OPENAI_API_KEY = _get(CONFIG, "api_providers.openai.api_key")
    OPENAI_BASE_URL = _get(CONFIG, "api_providers.openai.base_url")
    OPENAI_ENABLE_PROXY = _get(CONFIG, "api_providers.openai.enable_proxy")
    GEMINI_API_KEY = _get(CONFIG, "api_providers.gemini.api_key")
    GOOGLE_GEMINI_BASE_URL = _get(CONFIG, "api_providers.gemini.base_url")
    GEMINI_ENABLE_PROXY = _get(CONFIG, "api_providers.gemini.enable_proxy")
    DEEPSEEK_API_KEY = _get(CONFIG, "api_providers.deepseek.api_key")
    DEEPSEEK_BASE_URL = _get(CONFIG, "api_providers.deepseek.base_url")
    DEEPSEEK_ENABLE_PROXY = _get(CONFIG, "api_providers.deepseek.enable_proxy")
    DASHSCOPE_API_KEY = _get(CONFIG, "api_providers.dashscope.api_key")
    DASHSCOPE_BASE_URL = _get(CONFIG, "api_providers.dashscope.base_url")
    DASHSCOPE_ENABLE_PROXY = _get(CONFIG, "api_providers.dashscope.enable_proxy")
    ARK_API_KEY = _get(CONFIG, "api_providers.ark.api_key")
    ARK_BASE_URL = _get(CONFIG, "api_providers.ark.base_url")
    ARK_ENABLE_PROXY = _get(CONFIG, "api_providers.ark.enable_proxy")
    KLING_ACCESS_KEY = _get(CONFIG, "api_providers.kling.access_key")
    KLING_SECRET_KEY = _get(CONFIG, "api_providers.kling.secret_key")
    KLING_BASE_URL = _get(CONFIG, "api_providers.kling.base_url")
    KLING_ENABLE_PROXY = _get(CONFIG, "api_providers.kling.enable_proxy")
    TOKENPLUS_API_KEY = _get(CONFIG, "api_providers.tokenplus.api_key")
    TOKENPLUS_BASE_URL = _get(CONFIG, "api_providers.tokenplus.base_url")
    TOKENPLUS_ENABLE_PROXY = _get(CONFIG, "api_providers.tokenplus.enable_proxy")
    MINIMAX_API_KEY = _get(CONFIG, "api_providers.minimax.api_key")
    MINIMAX_BASE_URL = _get(CONFIG, "api_providers.minimax.base_url")
    MINIMAX_ENABLE_PROXY = _get(CONFIG, "api_providers.minimax.enable_proxy")

    LLM_API_KEY = DASHSCOPE_API_KEY
    LLM_BASE_URL = ""
    LLM_MODEL = _get(CONFIG, "models.llm")
    VLM_MODEL = _get(CONFIG, "models.vlm")
    IMAGE_IT2I_MODEL = _get(CONFIG, "models.image_it2i")
    IMAGE_T2I_MODEL = _get(CONFIG, "models.image_t2i")
    VIDEO_MODEL = _get(CONFIG, "models.video")
    VIDEO_FIRST_FRAME_MODEL = _get(CONFIG, "models.video_first_frame")
    VIDEO_START_END_MODEL = _get(CONFIG, "models.video_start_end")
    VIDEO_REFERENCE_MODEL = _get(CONFIG, "models.video_reference")
    VIDEO_RATIO = _get(CONFIG, "generation.video_ratio")
    VIDEO_RESOLUTION = _get(CONFIG, "generation.video_resolution")
    VIDEO_GENERATION_MODE = _get(CONFIG, "generation.video_generation_mode")
    STYLE = _get(CONFIG, "generation.style")

    BASE_DIR = str(BASE_DIR)
    CODE_DIR = os.path.join(BASE_DIR, "code")
    RESULT_DIR = os.path.join(CODE_DIR, "result")
    TEMP_DIR = os.path.join(BASE_DIR, "temp")
    SESSION_DIR = os.path.join(CODE_DIR, "data", "sessions")
    TASK_DIR = os.path.join(CODE_DIR, "data", "tasks")
    TASK_RESULT_DIR = os.path.join(RESULT_DIR, "task")

    @classmethod
    def as_dict(cls) -> Dict[str, Any]:
        return copy.deepcopy(cls.CONFIG)

    @classmethod
    def as_public_dict(cls) -> Dict[str, Any]:
        return redact_config(cls.CONFIG)

    @classmethod
    def provider_proxy(cls, provider: str) -> str:
        provider_config = _get(cls.CONFIG, f"api_providers.{provider}", {})
        if not isinstance(provider_config, dict) or not _as_bool(provider_config.get("enable_proxy")):
            return ""
        return cls.PROXY or ""

    @classmethod
    def requests_proxies(cls, provider: str) -> Optional[Dict[str, str]]:
        proxy = cls.provider_proxy(provider)
        if not proxy:
            return None
        return {"http": proxy, "https": proxy}

    @classmethod
    def update_config(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        clean = save_config(merge_config_update(cls.CONFIG, values))
        cls.CONFIG = clean

        cls.HOST = _get(clean, "server.host")
        cls.PORT = _get(clean, "server.port")
        cls.LOG_LEVEL = _get(clean, "server.log_level")
        cls.DEBUG = cls.LOG_LEVEL == "DEBUG"
        cls.ACCESS_LOG = _get(clean, "server.access_log")

        cls.PRINT_MODEL_INPUT = _get(clean, "api_providers.common.print_model_input")
        cls.PROXY = _get(clean, "api_providers.common.proxy")

        cls.OPENAI_API_KEY = _get(clean, "api_providers.openai.api_key")
        cls.OPENAI_BASE_URL = _get(clean, "api_providers.openai.base_url")
        cls.OPENAI_ENABLE_PROXY = _get(clean, "api_providers.openai.enable_proxy")
        cls.GEMINI_API_KEY = _get(clean, "api_providers.gemini.api_key")
        cls.GOOGLE_GEMINI_BASE_URL = _get(clean, "api_providers.gemini.base_url")
        cls.GEMINI_ENABLE_PROXY = _get(clean, "api_providers.gemini.enable_proxy")
        cls.DEEPSEEK_API_KEY = _get(clean, "api_providers.deepseek.api_key")
        cls.DEEPSEEK_BASE_URL = _get(clean, "api_providers.deepseek.base_url")
        cls.DEEPSEEK_ENABLE_PROXY = _get(clean, "api_providers.deepseek.enable_proxy")
        cls.DASHSCOPE_API_KEY = _get(clean, "api_providers.dashscope.api_key")
        cls.DASHSCOPE_BASE_URL = _get(clean, "api_providers.dashscope.base_url")
        cls.DASHSCOPE_ENABLE_PROXY = _get(clean, "api_providers.dashscope.enable_proxy")
        cls.ARK_API_KEY = _get(clean, "api_providers.ark.api_key")
        cls.ARK_BASE_URL = _get(clean, "api_providers.ark.base_url")
        cls.ARK_ENABLE_PROXY = _get(clean, "api_providers.ark.enable_proxy")
        cls.KLING_ACCESS_KEY = _get(clean, "api_providers.kling.access_key")
        cls.KLING_SECRET_KEY = _get(clean, "api_providers.kling.secret_key")
        cls.KLING_BASE_URL = _get(clean, "api_providers.kling.base_url")
        cls.KLING_ENABLE_PROXY = _get(clean, "api_providers.kling.enable_proxy")
        cls.TOKENPLUS_API_KEY = _get(clean, "api_providers.tokenplus.api_key")
        cls.TOKENPLUS_BASE_URL = _get(clean, "api_providers.tokenplus.base_url")
        cls.TOKENPLUS_ENABLE_PROXY = _get(clean, "api_providers.tokenplus.enable_proxy")
        cls.MINIMAX_API_KEY = _get(clean, "api_providers.minimax.api_key")
        cls.MINIMAX_BASE_URL = _get(clean, "api_providers.minimax.base_url")
        cls.MINIMAX_ENABLE_PROXY = _get(clean, "api_providers.minimax.enable_proxy")

        cls.LLM_API_KEY = cls.DASHSCOPE_API_KEY
        cls.LLM_BASE_URL = ""
        cls.LLM_MODEL = _get(clean, "models.llm")
        cls.VLM_MODEL = _get(clean, "models.vlm")
        cls.IMAGE_IT2I_MODEL = _get(clean, "models.image_it2i")
        cls.IMAGE_T2I_MODEL = _get(clean, "models.image_t2i")
        cls.VIDEO_MODEL = _get(clean, "models.video")
        cls.VIDEO_FIRST_FRAME_MODEL = _get(clean, "models.video_first_frame")
        cls.VIDEO_START_END_MODEL = _get(clean, "models.video_start_end")
        cls.VIDEO_REFERENCE_MODEL = _get(clean, "models.video_reference")
        cls.VIDEO_RATIO = _get(clean, "generation.video_ratio")
        cls.VIDEO_RESOLUTION = _get(clean, "generation.video_resolution")
        cls.VIDEO_GENERATION_MODE = _get(clean, "generation.video_generation_mode")
        cls.STYLE = _get(clean, "generation.style")
        return cls.as_dict()

    @classmethod
    def check_dirs(cls):
        data_dir = os.path.join(cls.CODE_DIR, "data")
        for directory in [
            cls.CODE_DIR,
            data_dir,
            cls.SESSION_DIR,
            cls.TASK_DIR,
            cls.RESULT_DIR,
            cls.TASK_RESULT_DIR,
            cls.TEMP_DIR,
        ]:
            if not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)
                logger.info("Created directory: %s", directory)


Config.check_dirs()
settings = Config()
