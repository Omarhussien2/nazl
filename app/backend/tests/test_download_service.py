import pytest

from services import download_service


def test_build_ydl_opts_includes_proxy_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("YTDLP_PROXY_URL", "http://proxy.example:8080")

    assert download_service._build_ydl_opts()["proxy"] == "http://proxy.example:8080"
    assert (
        download_service._build_ydl_opts(audio_only=True)["proxy"]
        == "http://proxy.example:8080"
    )


def test_build_ydl_opts_omits_proxy_when_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("YTDLP_PROXY_URL", raising=False)

    assert "proxy" not in download_service._build_ydl_opts()


@pytest.mark.parametrize(
    "message",
    [
        "Sign in to confirm you’re not a bot",
        "Sign in to confirm you're not a bot",
    ],
)
def test_translate_download_error_explains_youtube_proxy_need(message: str) -> None:
    assert (
        download_service._translate_download_error(message)
        == download_service.YOUTUBE_PROXY_ERROR
    )


def test_translate_download_error_preserves_generic_login_message() -> None:
    assert download_service._translate_download_error("ERROR: login required") == (
        "الفيديو يتطلب تسجيل دخول"
    )
