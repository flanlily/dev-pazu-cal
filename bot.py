
from discord.ext import tasks
import json
import os
from datetime import datetime, timezone

ANNOUNCEMENTS_FILE = 'announcements.json'
LAST_CHECK_FILE = 'last_checked.txt'
CHANNEL_ID = 1393963700569767968

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.messages = True
client = discord.Client(intents=intents)

def load_last_checked():
    if os.path.exists(LAST_CHECK_FILE):
        with open(LAST_CHECK_FILE, 'r') as f:
            t = f.read().strip()
            try:
                return datetime.fromisoformat(t)
            except Exception:
                return None
    return None

def save_last_checked(dt):
    with open(LAST_CHECK_FILE, 'w') as f:
        f.write(dt.isoformat())

def load_announcements():
    if os.path.exists(ANNOUNCEMENTS_FILE):
        with open(ANNOUNCEMENTS_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_announcements(data):
    with open(ANNOUNCEMENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')
    check_channel_messages.start()

@tasks.loop(hours=12)
async def check_channel_messages():
    print('Checking channel messages...')
    channel = client.get_channel(CHANNEL_ID)
    print(f'Channel: {channel}')
    if channel is None:
        print(f'Channel ID {CHANNEL_ID} not found.')
        return
    last_checked = load_last_checked()
    after = last_checked if last_checked else None  # 初回は全件取得
    messages = []
    async for msg in channel.history(limit=100, after=after):
        if msg.author == client.user:
            continue
        messages.append(msg)
    if not messages:
        print('新しいメッセージはありません。')
        save_last_checked(datetime.now(timezone.utc))
        return
    messages = sorted(messages, key=lambda m: m.created_at)
    data = load_announcements()
    for msg in messages:
        data.append({
            "date": msg.created_at.strftime('%Y/%m/%d'),
            "content": msg.content
        })
    save_announcements(data)
    print(f'{len(messages)}件のお知らせを追加しました。')
    save_last_checked(datetime.now(timezone.utc))

if __name__ == '__main__':
    import sys
    token = os.environ.get('DISCORD_BOT_TOKEN')
    if not token and len(sys.argv) > 1:
        token = sys.argv[1]
    if not token:
        print('DISCORD_BOT_TOKEN環境変数か引数でトークンを指定してください')
        exit(1)
    client.run(token)
