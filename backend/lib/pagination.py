def calculate_pagination(page: int, page_size: int, total: int):
    page = max(page, 1)
    page_size = max(page_size, 1)
    offset = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return {
        "offset": offset,
        "total_pages": total_pages,
    }
