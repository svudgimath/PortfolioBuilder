import httpx

GITHUB_API_BASE = "https://api.github.com"


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def get_current_user(token: str) -> dict:
    response = httpx.get(f"{GITHUB_API_BASE}/user", headers=_headers(token))
    response.raise_for_status()
    data = response.json()
    return {"id": data.get("id"), "login": data.get("login"), "name": data.get("name")}


def create_repo(token: str, repo_name: str) -> dict:
    # No error wrapping here on purpose — mirrors the Java client, where a failure
    # propagates raw (uncaught) into a generic 500. This path is only hit right after
    # repo_exists() confirmed the name is free, so failures here are unusual.
    response = httpx.post(
        f"{GITHUB_API_BASE}/user/repos",
        headers=_headers(token),
        json={"name": repo_name, "private": False},
    )
    response.raise_for_status()
    return response.json()


def repo_exists(token: str, owner: str, repo_name: str) -> bool:
    response = httpx.get(f"{GITHUB_API_BASE}/repos/{owner}/{repo_name}", headers=_headers(token))
    if response.status_code == 404:
        return False
    if response.status_code >= 400:
        raise RuntimeError(f"GitHub repo check failed: {response.status_code}")
    return True


def upsert_file(token: str, owner: str, repo: str, path: str, base64_content: str, commit_message: str) -> None:
    sha = None
    get_response = httpx.get(f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}", headers=_headers(token))
    if get_response.status_code == 404:
        sha = None  # file does not exist yet — create without sha
    elif get_response.status_code >= 400:
        raise RuntimeError(f"GitHub get content failed for {path} status={get_response.status_code}")
    else:
        sha = get_response.json().get("sha")

    body = {"message": commit_message, "content": base64_content}
    if sha:
        body["sha"] = sha

    put_response = httpx.put(
        f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}", headers=_headers(token), json=body
    )
    if put_response.status_code >= 400:
        raise RuntimeError(
            f"GitHub upsert failed for {path} status={put_response.status_code} body={put_response.text}"
        )


def enable_pages(token: str, owner: str, repo: str, branch: str = "main") -> dict:
    response = httpx.post(
        f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pages",
        headers=_headers(token),
        json={"source": {"branch": branch, "path": "/"}},
    )
    response.raise_for_status()
    return response.json()
