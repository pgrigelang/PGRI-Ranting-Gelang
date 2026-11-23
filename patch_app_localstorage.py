import re

with open("src/App.tsx", "r") as f:
    content = f.read()

def local_state_replace(name, initial, tpe):
    return f"""  const [{name}, set{name.capitalize()}] = useState<{tpe}>(() => {{
    try {{
      const saved = localStorage.getItem('kombel-{name}');
      return saved ? JSON.parse(saved) : {initial};
    }} catch (e) {{
      return {initial};
    }}
  }});

  React.useEffect(() => {{
    localStorage.setItem('kombel-{name}', JSON.stringify({name}));
  }}, [{name}]);
"""

# Replace teachers
content = re.sub(r'const \[teachers, setTeachers\] = useState<Teacher\[\]>\(INITIAL_TEACHERS\);', local_state_replace('teachers', 'INITIAL_TEACHERS', 'Teacher[]'), content)

# Replace materials
content = re.sub(r'const \[materials, setMaterials\] = useState<Material\[\]>\(INITIAL_MATERIALS\);', local_state_replace('materials', 'INITIAL_MATERIALS', 'Material[]'), content)

# Replace forumPosts
content = re.sub(r'const \[forumPosts, setForumPosts\] = useState<ForumPost\[\]>\(INITIAL_FORUM_POSTS\);', local_state_replace('forumPosts', 'INITIAL_FORUM_POSTS', 'ForumPost[]'), content)

# Replace financialTransactions
content = re.sub(r'const \[financialTransactions, setFinancialTransactions\] = useState<FinancialTransaction\[\]>\(INITIAL_FINANCIAL_TRANSACTIONS\);', local_state_replace('financialTransactions', 'INITIAL_FINANCIAL_TRANSACTIONS', 'FinancialTransaction[]'), content)

# Replace cashPayments
content = re.sub(r'const \[cashPayments, setCashPayments\] = useState<CashPayment\[\]>\(INITIAL_CASH_PAYMENTS\);', local_state_replace('cashPayments', 'INITIAL_CASH_PAYMENTS', 'CashPayment[]'), content)

with open("src/App.tsx", "w") as f:
    f.write(content)

