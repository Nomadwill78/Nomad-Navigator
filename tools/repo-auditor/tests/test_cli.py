from auditor.cli import _validate_github_url


def test_validate_github_url_accepts_repository_url() -> None:
    assert _validate_github_url("https://github.com/Nomadwill78/Nomad-Navigator") == (
        "https://github.com/Nomadwill78/Nomad-Navigator.git"
    )


def test_validate_github_url_rejects_non_github_host() -> None:
    try:
        _validate_github_url("https://example.com/Nomadwill78/Nomad-Navigator")
    except ValueError:
        pass
    else:
        raise AssertionError("Expected non-GitHub host to be rejected")
