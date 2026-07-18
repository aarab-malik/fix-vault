import pytest
from app.utils.auth import create_access_token, decode_access_token, hash_password, verify_password
from app.utils.crypto import decrypt_value, encrypt_value, mask_secret
from app.utils.text import slugify_stop_code


def test_password_hash_roundtrip():
    hashed = hash_password("secret-password")
    assert verify_password("secret-password", hashed)
    assert not verify_password("wrong", hashed)


def test_jwt_roundtrip():
    token = create_access_token("user@example.com")
    assert decode_access_token(token) == "user@example.com"


def test_encrypt_decrypt():
    original = "sk-test-key-12345"
    enc = encrypt_value(original)
    assert decrypt_value(enc) == original
    assert enc != original


def test_mask_secret():
    assert mask_secret("sk-abcdefghijklmnop") == "sk-…nop"
    assert mask_secret(None) is None


def test_slugify_stop_code():
    assert slugify_stop_code("Windows blue screen usbaudio.sys") == "WINDOWS_BLUE_SCREEN_USBAUDIO_SYS"
