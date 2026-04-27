from starlette.requests import Request

from dependencies.identity import _anonymous_id


def make_request(
    headers: dict[str, str] | None = None,
    client_host: str = "203.0.113.10",
) -> Request:
    raw_headers = [
        (name.lower().encode("latin-1"), value.encode("latin-1"))
        for name, value in (headers or {}).items()
    ]
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/download/transcribe",
            "headers": raw_headers,
            "client": (client_host, 443),
            "server": ("testserver", 80),
            "scheme": "https",
        }
    )


def test_anonymous_id_uses_first_forwarded_for_ip_before_proxy_ip() -> None:
    headers = {
        "x-forwarded-for": "198.51.100.24, 10.0.0.1",
        "user-agent": "Mozilla/5.0",
    }

    first_request = make_request(headers=headers, client_host="10.0.0.1")
    second_request = make_request(headers=headers, client_host="10.0.0.2")

    assert _anonymous_id(first_request) == _anonymous_id(second_request)


def test_anonymous_id_changes_when_forwarded_for_client_ip_changes() -> None:
    first_request = make_request(
        headers={
            "x-forwarded-for": "198.51.100.24, 10.0.0.1",
            "user-agent": "Mozilla/5.0",
        },
        client_host="10.0.0.1",
    )
    second_request = make_request(
        headers={
            "x-forwarded-for": "198.51.100.25, 10.0.0.1",
            "user-agent": "Mozilla/5.0",
        },
        client_host="10.0.0.1",
    )

    assert _anonymous_id(first_request) != _anonymous_id(second_request)
