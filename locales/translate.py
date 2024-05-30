import sys
import os
import json

global new

with open("grafana.json", "r") as f:
    translated = json.loads(f.read())

with open("grafana.json.original", "r") as f:
    original = json.loads(f.read())

with open(sys.argv[1], "r") as f:
    new = f.read()

def iterate_nested_json_for_loop(obj1, obj2):
    global new
    for key, value in obj1.items():
        if isinstance(value, dict):
            iterate_nested_json_for_loop(value, obj2[key])
        else:
            # print("replacing", obj2[key], value)
            new = new.replace(':"' + obj2[key], ':"' + value)

iterate_nested_json_for_loop(translated, original)
print(new)

