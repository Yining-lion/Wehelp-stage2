import {renderHeader, userAuthEvents, checkSignInStatus} from "./header.js"
import {escapeHTML} from "./escapeHTML.js"

const $ = (selector) => document.querySelector(selector);

renderHeader();
userAuthEvents();
checkSignInStatus();
loadAttraction();

async function loadAttraction() {

    try {
        let pathname = location.pathname
        let attractionId = pathname.split("/").pop()
        
        let res = await fetch(`/api/attraction/${attractionId}`, {
            method: "GET",
        });
        let data = await res.json();
        let attraction =  data.data;

        // 建立框架
        let { name = "", mrt = "", category = "", images, description="", address="", transport="" } = attraction; // 解構賦值並設立預設值

        // 進行轉義
        let safeName = escapeHTML(name || "");
        let safeMrt = escapeHTML(mrt || "");
        let safeCategory = escapeHTML(category || "");
        let safeDescription = escapeHTML(description || "");
        let safeAddress = escapeHTML(address || "");
        let safeTransport = escapeHTML(transport || "");
        
        // 處理上方 section
        let sectionHTML = `
        <div class="section_left">
            <div class="attraction_images">
            
            </div>
            <img class="btn_leftArrow" src="/static/data/images/btn_leftArrow.png">
            <img class="btn_rightArrow" src="/static/data/images/btn_rightArrow.png">
            <div class="circles">

            </div>
        </div>

        <div class="profile">
            <p class="dialog-title-bold attraction_name">${safeName}</p>
            <p class="body-medium attraction_category_mrt">${safeCategory} at ${safeMrt}</p>
            
            <form id="booking_form" class="booking_form" action="" method="">
                <p class="body-bold">訂購導覽行程</p>
                <p class="body-medium subtitle">以此景點為中心的一日行程，帶您探索城市角落故事</p>
                <div class="select_date">
                    <p class="body-bold" style="margin-right: 10px;">選擇日期：</p>
                    <input class="date_input body-medium" name="date" type="date">
                </div>
                <div class="select_time">
                    <p class="body-bold" style="margin-right: 10px;">選擇時間：</p>
                    <input class="body-medium" id="morning" name="time" type="radio" checked>
                    <label class="body-medium" for="morning" style="margin-right: 10px;">上半天</label>
                    <input class="body-medium" id="afternoon" name="time" type="radio">
                    <label class="body-medium" for="afternoon">下半天</label>
                </div>
                <div class="guide_cost">
                    <p class="body-bold" style="margin-right: 10px;">導覽費用：</p>
                    <p class="body-medium price">新台幣 2000 元</p>
                </div>
                <button class="btn-booking button-regular">開始預約行程</button>
            </form>
        </div>`;

        $(".section").insertAdjacentHTML("afterbegin", sectionHTML);
        if(mrt == null){$(".attraction_category_mrt").textContent = `${safeCategory}`} // 不要有 at
        $("#morning").addEventListener("change", updatePrice)
        $("#afternoon").addEventListener("change", updatePrice)

        // 處理圖片轉換效果
        let currentIndex = 0;
        updateImages();

        $(".btn_rightArrow").addEventListener("click", () => {
            $(`.attraction_img${currentIndex}`).style.opacity = "0";
            currentIndex = (currentIndex + 1) % images.length;
            $(`.attraction_img${currentIndex}`).style.opacity = "1";
            updateCircles();
        });

        $(".btn_leftArrow").addEventListener("click", () => {
            $(`.attraction_img${currentIndex}`).style.opacity = "0";
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            $(`.attraction_img${currentIndex}`).style.opacity = "1";
            updateCircles();
        });
        
        function updateImages(){
            images.forEach((image, index) => {
                let img = document.createElement("img");
                img.className = `attraction_img attraction_img${index}`;
                img.src = image;
                if(index === 0){img.style.opacity = "1"}
                else{img.style.opacity = "0"};
                $(".attraction_images").appendChild(img);
                updateCircles()
            });
        };

        function updateCircles(){
            $(".circles").innerHTML = ""; // 清空先前圓點
            images.forEach((image, index) => {
                let circle = document.createElement("img");
                if(index === currentIndex){circle.src = "/static/data/images/circle current.png"}
                else{circle.src = "/static/data/images/circle.png"};
                $(".circles").appendChild(circle);
            });
        };

        // 處理下方 infors
        let inforsHTML = `
            <p class="attraction_desctiption content-regular">${safeDescription}</p>
            <p class="body-bold">景點地址：</p>
            <p class="attraction_address content-regular">${safeAddress} </p>
            <p class="body-bold">交通方式：</p>
            <p class="attraction_transport content-regular">${safeTransport} </p>`;

        $(".infors").insertAdjacentHTML("afterbegin", inforsHTML);
  
    } catch(error) {
        console.log("加載景點數據出錯:", error)
    };
};

function updatePrice(){
    if($("#morning").checked)
        {$(".price").textContent = "新台幣 2000 元"}
    else{$(".price").textContent = "新台幣 2500 元"}
}