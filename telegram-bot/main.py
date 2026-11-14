"""Optional local polling version, preserved for development only.

Production uses /api/telegram-webhook.js in Vercel.
Do not run this polling process while a Telegram webhook is active.
Never commit the Telegram token into this file.
"""
import asyncio
import os

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.types import KeyboardButton, Message, ReplyKeyboardMarkup, WebAppInfo

BASE = "https://construction-webapp-eight.vercel.app/"
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
dp = Dispatcher()

keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="🏗 Otwórz aplikację CONSTRUCTION", web_app=WebAppInfo(url=BASE))],
        [KeyboardButton(text="🏢 Об'єкти"), KeyboardButton(text="📋 Заявки")],
        [KeyboardButton(text="🧮 Калькулятор"), KeyboardButton(text="ℹ️ Допомога")],
    ],
    resize_keyboard=True,
)

@dp.message(CommandStart())
@dp.message(Command("menu"))
async def start(message: Message):
    await message.answer(
        "<b>CONSTRUCTION GROUP</b>\nОберіть розділ у меню нижче.",
        reply_markup=keyboard,
    )

@dp.message()
async def actions(message: Message):
    text = (message.text or "").lower()
    if "об'єкти" in text:
        answer = f"🏢 Кабінет бригадира: {BASE}foreman.html"
    elif "заявки" in text:
        answer = f"📋 Заявки: {BASE}"
    elif "калькулятор" in text:
        answer = f"🧮 Калькулятор: {BASE}"
    else:
        answer = "Оберіть розділ із меню."
    await message.answer(answer, reply_markup=keyboard)

async def main():
    if not TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN must be set as an environment variable")
    bot = Bot(token=TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
