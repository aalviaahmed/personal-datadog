import json
import random


def lambda_handler(event, context):
    number = random.randint(1, 1000)
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"random_number": number}),
    }
