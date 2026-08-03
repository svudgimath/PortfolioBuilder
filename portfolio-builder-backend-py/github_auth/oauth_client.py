import httpx


def exchange_code_for_token(client_id: str, client_secret: str, code: str, redirect_uri: str) -> dict:
    """POST https://github.com/login/oauth/access_token — Accept: application/json is
    required explicitly, since GitHub defaults to form-encoded responses otherwise."""
    response = httpx.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        json={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        },
    )
    response.raise_for_status()
    data = response.json()
    return {
        "access_token": data.get("access_token"),
        "token_type": data.get("token_type"),
        "scope": data.get("scope"),
    }
