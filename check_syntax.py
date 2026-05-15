import sys

def check_braces(filename):
    with open(filename, 'r') as f:
        content = f.read()

    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char == '{':
                stack.append(('{', i + 1, j + 1))
            elif char == '}':
                if not stack:
                    print(f"Extra closing brace at line {i+1}, col {j+1}")
                    return False
                stack.pop()

    if stack:
        for char, line, col in stack:
            print(f"Unclosed brace '{char}' from line {line}, col {col}")
        return False

    print("Braces are balanced.")
    return True

if __name__ == "__main__":
    check_braces('src/index.ts')
