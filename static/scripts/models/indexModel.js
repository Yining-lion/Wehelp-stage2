export async function fetchMRTList() {
    let res = await fetch("/api/mrts");
    let data = await res.json();
    return data.data;
}

export async function fetchAttractions(page, keyword = "") {
    let url = `/api/attractions?page=${page}`;
    if (keyword) {
        url += `&keyword=${encodeURIComponent(keyword)}`;
    }

    let res = await fetch(url);
    let data = await res.json();
    return data;
}
