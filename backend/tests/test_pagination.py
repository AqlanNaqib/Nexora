from lib.pagination import calculate_pagination


def test_first_page_offset_is_zero():
    result = calculate_pagination(page=1, page_size=10, total=25)
    assert result["offset"] == 0


def test_second_page_offset():
    result = calculate_pagination(page=2, page_size=10, total=25)
    assert result["offset"] == 10


def test_total_pages_rounds_up():
    result = calculate_pagination(page=1, page_size=10, total=25)
    assert result["total_pages"] == 3


def test_total_pages_exact_division():
    result = calculate_pagination(page=1, page_size=10, total=20)
    assert result["total_pages"] == 2


def test_zero_total_returns_one_page():
    result = calculate_pagination(page=1, page_size=10, total=0)
    assert result["total_pages"] == 1
