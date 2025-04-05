import {renderHeader, userAuthEvents, checkSignInStatus} from "./header.js"
import {escapeHTML} from "./escapeHTML.js"

const $ = (selector) => document.querySelector(selector);

renderHeader();
userAuthEvents();
checkSignInStatus();
renderMRTList();
loadAttractions(0);
$(".arrow_left").addEventListener("click", () => scrollMRTList("left"))
$(".arrow_right").addEventListener("click", () => scrollMRTList("right"))

async function renderMRTList() {
    let res = await fetch("api/mrts", {
        method: "GET",
    });
    let data = await res.json();
    let mrt_list =  data.data;
    // 建立框架
    mrt_list.forEach(mrt => {
        let p = document.createElement("p");
        p.textContent = mrt;
        p.className = "mrt_list_text"
        $(".mrt_list").appendChild(p);
    });  
};

function scrollMRTList(direction){
    let scroll_amout = 200;
    if(direction==="left"){
        $(".mrt_list").scrollLeft -= scroll_amout;
    };
    if(direction==="right"){
        $(".mrt_list").scrollLeft += scroll_amout;
    }
};

let next_page = 0
let current_keyword = ""
async function loadAttractions(page, keyword="") {

    try {
        let url = `/api/attractions?page=${page}`;
        if(keyword){ 
            url += `&keyword=${encodeURIComponent(keyword)}`;
            if(page === 0){ 
                $(".content").innerHTML = ""; // 有關鍵字搜尋就先清空之前的資料
            };
        };

        let res = await fetch(url, {
            method: "GET",
        });
        let data = await res.json();
        let attraction_list =  data.data;
        next_page = data.nextPage; 

        // 建立框架
        attraction_list.forEach(attraction => {
            let { name = "", mrt = "", category = "", id, images } = attraction; // 解構賦值並設立預設值
            let img = images[0];
            // 進行轉義
            let safeName = escapeHTML(name || "");
            let safeMrt = escapeHTML(mrt || "");
            let safeCategory = escapeHTML(category || "");
            
            let attractionHTML = `
            <div class="attraction">
                <a href="/attraction/${id}">
                    <div class="attraction_top" style="background-image: url(${img})">
                        <p class="attraction_name body-bold">${safeName}</p>
                    </div>
                </a>
                <div class="attraction_buttom body-medium">
                    <p class="attraction_mrt">${safeMrt}</p>
                    <p class="attraction_category">${safeCategory}</p>
                </div>
            </div>`;
    
            $(".content").insertAdjacentHTML("beforeend", attractionHTML);

            if (next_page !== null) {
                observer.observe($(".footer"));
            }
        });  
    } catch(error) {
        console.log("加載景點數據出錯:", error)
    }
};

function handleSearch(){
    let keyword = $(".search_input").value.trim();
    $(".search_input").value ="";
    if(!keyword) return; // 沒有關鍵字禁止觸發請求
    current_keyword = keyword;
    observer.disconnect(); // 先停止監聽，避免 observer 觸發額外請求
    loadAttractions(0, keyword)
}

$(".search_btn").addEventListener("click", handleSearch)

$(".search_input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {handleSearch();}
});

$(".mrt_list").addEventListener("click", (e) => {
    let keyword = e.target.textContent;
    current_keyword = keyword;
    observer.disconnect(); // 先停止監聽，避免 observer 觸發額外請求
    loadAttractions(0, keyword)
})

// IntersectionObserver(callback, options)
let observer = new IntersectionObserver((entries) => {
    let entry = entries[0]
    if(entry.isIntersecting  && next_page !== null){
        loadAttractions(next_page, current_keyword)
        observer.unobserve(entry.target) // 載入後就不要再觀察，避免重複載入
    }
}, { rootMargin: "250px" }) // 擴大根元素的邊界 // root 用來設置觀察的根元素，若不設置默認為 viewport