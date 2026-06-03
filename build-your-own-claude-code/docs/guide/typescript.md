# TypeScript 基础

如果你熟悉 JavaScript，TypeScript 主要多了类型系统。以下是本项目用到的关键概念。

## 类型基础

```typescript
// 基本类型
let name: string = "hello";
let count: number = 42;
let flag: boolean = true;

// 接口
interface Message {
  role: "user" | "assistant";  // 字面量联合类型
  content: string;
}

// 类型别名
type ContentBlock = TextBlock | ToolUseBlock;  // 联合类型
```

## 异步编程

```typescript
// async/await
async function fetchData(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}

// AsyncGenerator — 本项目的核心模式
async function* countdown(n: number): AsyncGenerator<number> {
  while (n > 0) {
    yield n;  // 每次 yield 一个值
    n--;
  }
}

// 消费 AsyncGenerator
for await (const num of countdown(5)) {
  console.log(num);  // 5, 4, 3, 2, 1
}
```

## 推荐资源

- [TypeScript 官方教程](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript 深入理解](https://jkchao.github.io/typescript-book-chinese/)
