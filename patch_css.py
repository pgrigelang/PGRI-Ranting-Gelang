import re

with open("src/index.css", "r") as f:
    content = f.read()

# Add select-none to body and ensure inputs are selectable
css_to_add = """
@layer base {
  body {
    user-select: none;
    -webkit-user-select: none;
  }
  input, textarea, [contenteditable] {
    user-select: text;
    -webkit-user-select: text;
  }
}
"""

if "user-select: none" not in content:
    content += "\n" + css_to_add

with open("src/index.css", "w") as f:
    f.write(content)
