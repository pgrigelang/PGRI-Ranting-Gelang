import re

with open("src/App.tsx", "r") as f:
    content = f.read()

def inject_push(state_name):
    # e.g., localStorage.setItem('kombel-teachers', JSON.stringify(teachers));
    pattern = r"(localStorage\.setItem\('kombel-" + state_name + r"', JSON\.stringify\(" + state_name + r"\)\);)"
    replacement = r"\1\n    syncToFirebase('" + state_name + r"', " + state_name + r");"
    return re.sub(pattern, replacement, content)

content = inject_push('teachers')
content = inject_push('materials')
content = inject_push('events')
content = inject_push('attendanceList')
content = inject_push('forumPosts')
content = inject_push('financialTransactions')
content = inject_push('cashPayments')

with open("src/App.tsx", "w") as f:
    f.write(content)

