API CursorAI (Cursor) – справочник

    Базовый URL и авторизация: все запросы отправляются на https://api.cursor.com (версия v0 или v1 зависит от задачи). Для доступа необходим API-ключ (создаётся в настройках команды Cursor). В Cloud Agents API (v0) используется Basic Auth (curl -u API_KEY:), для запросов v1 — заголовок Authorization: Bearer API_KEY
    github.com
    .

1. Список доступных моделей

    GET /v0/models – возвращает список рекомендованных моделей для фоновых агентов
    coconote.app
    . Предполагается, что клиент поддерживает опцию «Auto» (выбор модели автоматически).
    Пример запроса:

curl -u YOUR_API_KEY: https://api.cursor.com/v0/models

Пример ответа:

    {
      "models": [
        "claude-4-sonnet-thinking",
        "o3",
        "claude-4-opus-thinking",
        "gemini-1b",
        "gpt-4o-advanced"
      ]
    }

    (Ответ содержит список строк – идентификаторов моделей, доступных для использования с агентами.)

2. Управление агентами и назначение моделей

    POST /v0/agents – создаёт (запускает) нового фонового агента. В теле запроса указываются параметры задачи, включая модель, которая будет использована для генерации кода
    coconote.app
    . Типовые поля тела (JSON):

        prompt.text – текст инструкции или описания задачи.

        source.repository, source.ref – URL репозитория и ветка/коммит, над которыми работает агент.

        model – идентификатор модели (из списка выше), например "claude-4-opus-thinking".

        target – настройки публикации результата (например, autoCreatePr: true).

        Дополнительно можно указать webhook (URL и секрет для уведомлений о событиях).

    Пример запроса (cURL):

curl -u YOUR_API_KEY: -X POST https://api.cursor.com/v0/agents \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": {"text": "Добавь файл README.md с инструкцией по установке."},
       "source": {"repository": "https://github.com/user/repo", "ref": "main"},
       "model": "claude-4-opus-thinking",
       "target": {"autoCreatePr": true}
     }'

Пример ответа:

    {
      "id": "ag_abc123",
      "name": null,
      "status": "CREATING",
      "source": {"repository": "https://github.com/user/repo", "ref": "main"},
      "target": {"autoCreatePr": true, "openAsCursorGithubApp": false, "branchName": null, "prUrl": null},
      "createdAt": "2025-12-01T12:00:00Z"
    }

    Ответ содержит идентификатор агента (id), его статус (CREATING при запуске), а также отражает переданные source, target и время создания
    coconote.app
    . После запуска статус агента изменится на RUNNING и затем на FINISHED по завершении задачи. Чтобы отправить дополнительные инструкции агента, можно использовать запрос POST /v0/agents/{id}/followup с аналогичным полем prompt (добавляет последующий запрос к уже запущенному агенту).

3. Мониторинг и логирование активности

    GET /v0/agents/{id}/conversation – возвращает историю переписки конкретного агента (все пользовательские запросы и ответы ассистента)
    coconote.app
    .
    Пример:

curl -u YOUR_API_KEY: https://api.cursor.com/v0/agents/ag_abc123/conversation

Пример ответа:

{
  "messages": [
    {"id": "msg1", "type": "user_message",      "text": "Добавь инструкцию по установке."},
    {"id": "msg2", "type": "assistant_message", "text": "Файл README.md был добавлен."}
  ]
}

Каждый объект message содержит type (user_message или assistant_message) и текст. Эта история позволяет увидеть, какие запросы были отправлены агенту и какой ответ получен.

Webhook-события – можно настроить URL, на который Cursor будет отправлять события агента в реальном времени. Например, изменения статуса агента или новые сообщения можно получать через вебхук с HMAC-SHA256-подписью
github.com
. Это позволяет автоматически логировать активности и статусы агента на вашей стороне.

Статистика использования API – для получения метрик использования (количество выполненных запросов, лимиты, время сброса) доступен эндпоинт v1:
GET /v1/usage/current – возвращает текущую статистику по вызовам вашего API-ключа.
Пример запроса:

curl -H "Authorization: Bearer YOUR_API_KEY" https://api.cursor.so/v1/usage/current

Пример ответа:

    {
      "project_id": "proj_abc123",
      "calls_used": 8472,
      "calls_limit": 10000,
      "reset_time": "2025-04-05T00:00:00Z",
      "rate_limit_window_sec": 3600
    }

    Поля calls_used и calls_limit показывают, сколько запросов уже выполнено и сколько разрешено по текущей квоте
    ask.csdn.net
    . Учтите, что использование Cursor API ограничено месячным лимитом вызовов, который зависит от вашего тарифа и стоимости моделей
    help.zapier.com
    . Повышение тарифного плана увеличивает доступные квоты.

Кроме того, для командных и корпоративных аккаунтов доступны Admin API и Analytics API (см. документацию Cursor), позволяющие получать расширенные логи аудита, аналитику использования и отслеживать изменения в проекте. Эти API дают возможность выгружать более подробные данные по активности пользователей, моделям и прочим метрикам.

Источники: официальная документация CursorAI по Cloud Agents API и публикации от команды Cursor
coconote.app
github.com
ask.csdn.net
.
Цитаты

GitHub - unkn0wncode/cursor-go-sdk: Go client for Cursor Background Agents — typed, minimal, and easy to use.
https://github.com/unkn0wncode/cursor-go-sdk

Cloud Agents API Overview | Coconote
https://coconote.app/notes/0b7e3eb9-42af-4002-903d-3b8150b82da4

Cloud Agents API Overview | Coconote
https://coconote.app/notes/0b7e3eb9-42af-4002-903d-3b8150b82da4

Cloud Agents API Overview | Coconote
https://coconote.app/notes/0b7e3eb9-42af-4002-903d-3b8150b82da4

GitHub - unkn0wncode/cursor-go-sdk: Go client for Cursor Background Agents — typed, minimal, and easy to use.
https://github.com/unkn0wncode/cursor-go-sdk

Cursor官网不显示使用次数了？_编程语言-CSDN问答
https://ask.csdn.net/questions/9065247

How to get started with Cursor on Zapier – Zapier
https://help.zapier.com/hc/en-us/articles/39428735617933-How-to-get-started-with-Cursor-on-Zapier