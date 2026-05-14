import json

with open("wrangler.jsonc", "r") as f:
    content = f.read()

# Since the file might have comments and we want to preserve its structure,
# let's parse it as JSON by stripping simple comments if any (there are none in the output)
data = json.loads(content)

data["durable_objects"] = {
    "bindings": [
        {
            "name": "LIVE_CLASS_CREDIT_MANAGER",
            "class_name": "LiveClassCreditManager"
        }
    ]
}
data["migrations"] = [
    {
        "tag": "v1",
        "new_sqlite_classes": ["LiveClassCreditManager"]
    }
]

with open("wrangler.json", "w") as f:
    json.dump(data, f, indent=2)
