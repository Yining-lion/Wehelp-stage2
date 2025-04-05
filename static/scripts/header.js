const $ = (selector) => document.querySelector(selector);

export function renderHeader(){
    let headerHTML = `
    <div class="navigation_container">
        <div class="navigation">
            <div class="navigation_left headline">
                <a class="navigation_left_text" href="/">台北一日遊</a>
            </div>
            <div class="navigation_right body-medium">
                <p class="">預定行程</p>
                <p class="signin_signup_text">登入/註冊</p>
                <p class="signout_text">登出系統</p>
            </div>
        </div>
    </div>


    <div class="overlay"></div>

    <div class="dialog_container signin_container">
        <p class="dialog-title-bold">登入會員帳號</p>
        <img class="close" src="/static/data/images/close.png">
        <form id="signin_form" class="sign_form">
            <input class="signin_email body-medium" name="email" type="email" placeholder="輸入電子信箱">
            <input class="signin_password body-medium" name="password" type="password" placeholder="輸入密碼">
            <button class="signin_btn btn-dialog button-regular">登入帳戶</button>
        </form>
        <p class="message body-medium"></p>
        <p class="signup_text body-medium">還沒有帳戶？點此註冊</p>
    </div>

    <div class="dialog_container signup_container">
        <p class="dialog-title-bold">註冊會員帳號</p>
        <img class="close" src="/static/data/images/close.png">
        <form id="signup_form" class="sign_form">
            <input class="signup_name body-medium" name="name" type="text" placeholder="輸入姓名">
            <input class="signup_email body-medium" name="email" type="email" placeholder="輸入電子信箱">
            <input class="signup_password body-medium" name="password" type="password" placeholder="輸入密碼">
            <button class="signup_btn btn-dialog button-regular">註冊新帳戶</button>
        </form>
        <p class="message body-medium"></p>
        <p class="signin_text body-medium">已經有帳戶了？點此登入</p>
    </div>
    `
    document.body.insertAdjacentHTML("afterbegin", headerHTML);

    $(".signin_signup_text").addEventListener("click", () => {
        $(".signin_container").style.display = "flex"; // 先出現讓 show 動畫可以順利進行
        $(".overlay").style.display = "block";
        setTimeout(() => {
            $(".signin_container").classList.add("show");
        }, 10);
    })
    
    document.querySelectorAll(".close").forEach(button => {
        button.addEventListener("click", () => {
            $(".signin_container").classList.remove("show");
            $(".signup_container").classList.remove("show");
            $(".signin_container").style.display = "none";
            $(".signup_container").style.display = "none";
            $(".overlay").style.display = "none";
            $(".signin_email").value ="";
            $(".signin_password").value ="";
            $(".signin_container .message").style.display = "none";
            $(".signup_name").value ="";
            $(".signup_email").value ="";
            $(".signup_password").value ="";
            $(".signup_container .message").style.display = "none";
        });
    });
    
    $(".signup_text").addEventListener("click", () => {
        $(".signin_container").classList.remove("show");
        $(".signup_container").style.display = "flex"; // 先出現讓 show 動畫可以順利進行
        setTimeout(() => {
            $(".signup_container").classList.add("show");
        }, 10);
        $(".signin_email").value ="";
        $(".signin_password").value ="";
        $(".signin_container .message").style.display = "none";
    })
    
    $(".signin_text").addEventListener("click", () => {
        $(".signin_container").classList.add("show");
        $(".signup_container").classList.remove("show");
        $(".signup_name").value ="";
        $(".signup_email").value ="";
        $(".signup_password").value ="";
        $(".signup_container .message").style.display = "none";
    })
}

export function userAuthEvents(){
    // 處理註冊
    $("#signup_form").addEventListener("submit", async (e) => {
        e.preventDefault();
        let name = $(".signup_name").value.trim();
        let email = $(".signup_email").value.trim();
        let password = $(".signup_password").value.trim();

        if(name == "" || email == "" || password == ""){
            alert("請輸入姓名、信箱、密碼");
            return;
        }

        try {
            let res = await fetch("/api/user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, email, password })
            });
            
            let data = await res.json();
            if (data.ok) {
                $(".signup_container .message").style.display = "block";
                $(".signup_container .message").style.color = "#36BF36";
                $(".signup_container .message").textContent = "註冊成功，請登入系統";
            } else if (data.error) {
                $(".signup_container .message").style.display = "block";
                $(".signup_container .message").style.color = "#8B0000";
                $(".signup_container .message").textContent = data.message;
            }
        } catch (error) {
            console.error(error);
        }
    })

    // 處理登入
    $("#signin_form").addEventListener("submit", async (e) => {
        e.preventDefault();
        let email = $(".signin_email").value.trim();
        let password = $(".signin_password").value.trim();

        if(email == "" || password == ""){
            alert("請輸入信箱、密碼");
            return;
        }

        try {
            let res = await fetch("/api/user/auth", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password })
            });
            
            let data = await res.json();

            if (data.token) {
                localStorage.setItem("token", data.token);
                location.reload();
                checkSignInStatus();
            } else if (data.error) {
                $(".signin_container .message").style.display = "block";
                $(".signin_container .message").style.color = "#8B0000";
                $(".signin_container .message").textContent = data.message;
            }
        } catch (error) {
            console.error(error);
        }
    })
}

export async function checkSignInStatus() {
    let token = localStorage.getItem("token");
    if (!token) return;

    let res = await fetch("/api/user/auth", {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
        $(".signout_text").style.display = "block";
        $(".signin_signup_text").style.display = "none";
        $(".signout_text").onclick = signOut;
    } else {
        localStorage.removeItem("token");
    }
}

function signOut() {
    localStorage.removeItem("token");
    location.reload();
}
