import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

# 1. Add deleteAttendanceTarget state
content = content.replace(
    "const [deleteEventTarget, setDeleteEventTarget] = useState<ActivityEvent | null>(null);",
    "const [deleteEventTarget, setDeleteEventTarget] = useState<ActivityEvent | null>(null);\n  const [deleteAttendanceTarget, setDeleteAttendanceTarget] = useState<string | null>(null);"
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
