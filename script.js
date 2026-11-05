
const tg = window.Telegram.WebApp;

tg.ready();
tg.expand();

function openServices() {
    document.getElementById("services").scrollIntoView({
        behavior: "smooth"
    });
}

function selectService(service) {
    tg.showPopup({
        title: "Обрана послуга",
        message: service,
        buttons: [
            {
                id: "continue",
                type: "default",
                text: "Продовжити"
            },
            {
                type: "cancel",
                text: "Назад"
            }
        ]
    }, function(buttonId) {
        if (buttonId === "continue") {
            tg.sendData(JSON.stringify({
                service: service
            }));
        }
    });
}
