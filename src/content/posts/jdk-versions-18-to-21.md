---
title: "JDK 版本特性详解（三）：JDK 18-21 并发与新特性"
description: "JDK 18 到 21 的核心特性详解：UTF-8 默认编码、Simple Web Server、Virtual Threads、Sequenced Collections，到 JDK 21 LTS 正式落地虚拟线程。含完整版本选择建议。这是 JDK 8-21 特性系列的第三篇。"
date: 2026-04-21
category: "后端开发"
tags: ["java", "jdk", "jdk-features", "java-version"]
draft: false
---

## 简介

本篇是 JDK 版本特性系列的最后一篇，覆盖 **JDK 18-21**——以并发模型革新为主线的阶段。Virtual Threads 经过两轮预览在 **JDK 21 LTS** 正式落地，配合 Sequenced Collections 等特性。文末附完整的版本选择建议。

> 系列导航：
> - [（一）JDK 8-11 现代化基础](/posts/jdk-versions-8-to-11/)
> - [（二）JDK 12-17 语言增强](/posts/jdk-versions-12-to-17/)
> - **（三）JDK 18-21 并发与新特性**（本文）

---

## 十一、JDK 18 (2022年3月) - UTF-8 默认编码

### JDK 18 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **UTF-8 默认编码** | 正式 | 统一默认字符集为 UTF-8 | 高 |
| **Simple Web Server** | 正式 | 简易 Web 服务器，jwebserver 命令 | 中 |
| **@snippet Javadoc 标签** | 正式 | 代码片段标注 | 中 |

### 11.1 UTF-8 默认字符集

```java
import java.nio.charset.Charset;

public class UTF8DefaultDemo {
    public static void main(String[] args) {
        // JDK 17 及之前
        // 默认编码取决于操作系统：
        // - Windows: Cp1252
        // - Linux/Mac: UTF-8
        
        // JDK 18+
        // 默认编码统一为 UTF-8
        Charset defaultCharset = Charset.defaultCharset();
        System.out.println("Default charset: " + defaultCharset); // UTF-8
        
        // 文件读写
        String content = "中文内容 Hello World";
        
        // 默认使用 UTF-8
        // Files.writeString(path, content);
        // Files.readString(path);
        
        // 指定编码（如果需要）
        // Files.writeString(path, content, StandardCharsets.ISO_8859_1);
        
        // 控制台输出编码也使用 UTF-8
        System.out.println("控制台输出中文测试");
        
        // 需要显式指定编码的场景
        // 旧系统兼容、特定文件格式等
    }
}
```

### 11.2 Simple Web Server

简易 Web 服务器，用于测试和原型开发。

```bash
# 启动简易 Web 服务器
$ jwebserver

# 指定端口和目录
$ jwebserver -p 8080 -d /path/to/webroot

# 绑定特定地址
$ jwebserver -b 192.168.1.100

# 输出：
# Serving /path/to/webroot and subdirectories on 0.0.0.0 port 8080
# URL http://localhost:8080/
```

```java
// Java 代码启动
import java.net.InetSocketAddress;
import com.sun.net.httpserver.SimpleFileServer;

public class WebServerDemo {
    public static void main(String[] args) {
        var addr = new InetSocketAddress(8080);
        var server = SimpleFileServer.createFileServer(
            addr, 
            Path.of("/path/to/webroot"),
            SimpleFileServer.OutputLevel.INFO
        );
        
        server.start();
        System.out.println("Server started at http://localhost:8080");
    }
}
```

### 11.3 @snippet Javadoc 标签

在 Javadoc 中嵌入代码片段，支持语法高亮。

```java
/**
 * 使用 @snippet 标签在文档中展示代码示例
 * 
 * {@snippet :
 * // 简单示例
 * List<String> list = List.of("a", "b", "c");
 * list.forEach(System.out::println);
 * }
 * 
 * 支持语法高亮和替换：
 * {@snippet lang="java" :
 * String name = "World"; // @replace substring="World" replacement="User"
 * System.out.println("Hello, " + name);
 * }
 * 
 * 引用外部代码片段：
 * {@snippet file="SnippetExample.java" region="example"}
 * 
 * @see java.util.List
 */
public class SnippetJavadocDemo {
    // @snippet 标签使 Javadoc 文档更加清晰易读
    // 支持 lang 属性指定语言
    // 支持 @replace 进行替换
    // 支持 file 属性引用外部文件
}
```

---

## 十二、JDK 19 (2022年9月) - Virtual Threads 预览

### JDK 19 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **Virtual Threads** | 预览 | 轻量级线程，高并发革命性特性 | 高 |
| **Structured Concurrency** | 预览 | 结构化并发，简化多任务协调 | 高 |
| **Record Patterns** | 预览 | Record 的解构模式匹配 | 高 |

### 12.1 Virtual Threads（预览）

轻量级线程，大幅提升并发性能。

```java
import java.util.concurrent.*;

public class VirtualThreadDemo {
    // JDK 19 预览，JDK 21 正式
    public static void main(String[] args) throws Exception {
        // 创建虚拟线程
        Thread vt = Thread.ofVirtual().start(() -> {
            System.out.println("Virtual thread: " + Thread.currentThread());
        });
        vt.join();
        
        // 使用 ExecutorService
        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        
        // 提交任务
        for (int i = 0; i < 10000; i++) {
            executor.submit(() -> {
                // 模拟 I/O 操作
                try {
                    Thread.sleep(1000);
                    return fetchDataFromDatabase();
                } catch (InterruptedException e) {
                    return null;
                }
            });
        }
        
        // 传统线程池对比
        // 使用平台线程处理 10000 个任务：
        // - 需要约 200 个线程的池（避免内存溢出）
        // - 任务排队等待
        // - 总耗时：约 50 秒
        
        // 使用虚拟线程处理 10000 个任务：
        // - 创建 10000 个虚拟线程
        // - 无需排队
        // - 总耗时：约 1 秒
        
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);
    }
    
    static String fetchDataFromDatabase() {
        return "Data fetched at " + System.currentTimeMillis();
    }
}
```

### 12.2 Structured Concurrency（预览）

结构化并发，简化多任务协调。

```java
import java.util.concurrent.*;
import java.util.concurrent.StructuredTaskScope.*;

public class StructuredConcurrencyDemo {
    // JDK 19 预览，JDK 21 正式
    public static void main(String[] args) throws Exception {
        // 并行获取多个数据源
        WeatherData weather = fetchWeather("Beijing");
        System.out.println(weather);
    }
    
    static WeatherData fetchWeather(String city) throws Exception {
        // 使用 StructuredTaskScope
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            // 并行启动多个任务
            Future<String> temperature = scope.fork(() -> 
                fetchTemperature(city)
            );
            Future<String> humidity = scope.fork(() -> 
                fetchHumidity(city)
            );
            Future<String> wind = scope.fork(() -> 
                fetchWindSpeed(city)
            );
            
            // 等待所有任务完成或任一失败
            scope.join();
            scope.throwIfFailed();
            
            // 组合结果
            return new WeatherData(
                temperature.resultNow(),
                humidity.resultNow(),
                wind.resultNow()
            );
        }
    }
    
    static String fetchTemperature(String city) {
        // 模拟 API 调用
        return "25°C";
    }
    
    static String fetchHumidity(String city) {
        return "60%";
    }
    
    static String fetchWindSpeed(String city) {
        return "5 m/s";
    }
    
    record WeatherData(String temperature, String humidity, String wind) {}
}
```

---

## 十三、JDK 20 (2023年3月) - 特性增强

### JDK 20 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **Virtual Threads** | 第二次预览 | 轻量级线程继续优化 | 高 |
| **Record Patterns** | 第二次预览 | Record 解构模式匹配增强 | 高 |
| **Scoped Values** | 预览 | 线程内共享数据的安全机制 | 中 |

### 13.1 Record Patterns（预览）

```java
public class RecordPatternDemo {
    // JDK 20 预览，JDK 21 正式
    public static void main(String[] args) {
        Object obj = new Point(10, 20);
        
        // Record Pattern
        if (obj instanceof Point(int x, int y)) {
            System.out.println("Point: x=" + x + ", y=" + y);
        }
        
        // 嵌套 Record Pattern
        Object nested = new Line(new Point(0, 0), new Point(10, 10));
        
        if (nested instanceof Line(Point(int x1, int y1), Point(int x2, int y2))) {
            System.out.println("Line from (" + x1 + "," + y1 + ") to (" + x2 + "," + y2 + ")");
        }
        
        // 在 switch 中使用
        Shape shape = new Circle(5);
        String info = describeShape(shape);
        System.out.println(info);
    }
    
    static String describeShape(Shape shape) {
        return switch (shape) {
            case Circle(double r) -> "Circle radius: " + r;
            case Rectangle(double w, double h) -> "Rectangle: " + w + "x" + h;
        };
    }
}

record Point(int x, int y) {}
record Line(Point start, Point end) {}
sealed interface Shape permits Circle, Rectangle {}
record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}
```

### 13.2 Scoped Values(预览)

线程内安全共享数据的机制，比 ThreadLocal 更高效。

```java
import java.util.concurrent.ScopedValue;

public class ScopedValuesDemo {
    // Scoped Values 是 ThreadLocal 的现代替代
    
    // 定义 Scoped Value
    private static final ScopedValue<String> USER_ID = ScopedValue.newInstance();
    
    public static void main(String[] args) throws Exception {
        // 在作用域内绑定值
        ScopedValue.where(USER_ID, "user123")
            .run(() -> {
                // 在此作用域内，USER_ID.get() 返回 "user123"
                System.out.println("User ID: " + USER_ID.get());
                
                // 调用其他方法，值自动传递
                processRequest();
            });
        
        // 作用域外，USER_ID.get() 会抛出异常
        // USER_ID.get(); // NoSuchElementException
    }
    
    static void processRequest() {
        // 子方法自动继承 Scoped Value
        System.out.println("Processing for: " + USER_ID.get());
        
        // 支嵌套作用域
        ScopedValue.where(USER_ID, "nested_user")
            .run(() -> {
                System.out.println("Nested: " + USER_ID.get());
            });
        
        // 嵌套作用域结束后，恢复原值
        System.out.println("Back to: " + USER_ID.get());
    }
    
    // Scoped Value 优势：
    // - 作用域明确，不会泄漏
    // - 绑定后不可修改（不可变）
    // - 虚拟线程友好
    // - 性能优于 ThreadLocal
}
```

---

## 十四、JDK 21 (2023年9月) - 第三个 LTS 版本

### JDK 21 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **Virtual Threads** | 正式 | 轻量级线程成为正式特性 | 高 |
| **Sequenced Collections** | 正式 | 统一的顺序访问接口 | 高 |
| **Pattern Matching for Switch** | 正式 | switch 类型模式匹配成为正式特性 | 高 |
| **String Templates** | 预览 | 字符串模板，简化字符串构建 | 高 |

### 14.1 Virtual Threads 正式版

虚拟线程成为正式特性，彻底改变了 Java 并发编程。

```java
import java.util.concurrent.*;
import java.nio.channels.*;
import java.net.*;
import java.io.*;

public class VirtualThreadFinalDemo {
    public static void main(String[] args) throws Exception {
        // 正式可用，无需 --enable-preview
        
        // 创建虚拟线程工厂
        ThreadFactory factory = Thread.ofVirtual().factory();
        
        // 创建虚拟线程执行器
        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        
        // 高并发 HTTP 服务器示例
        ServerSocketChannel server = ServerSocketChannel.open();
        server.bind(new InetSocketAddress(8080));
        
        while (true) {
            SocketChannel socketChannel = server.accept();
            // 每个连接使用一个虚拟线程
            Thread.startVirtualThread(() -> handleRequest(socketChannel));
        }
    }
    
    static void handleRequest(SocketChannel channel) {
        try {
            // 处理请求（I/O 密集型）
            // 虚拟线程在等待 I/O 时不阻塞平台线程
            Socket socket = channel.socket();
            var input = socket.getInputStream();
            var output = socket.getOutputStream();
            
            // 读取请求
            byte[] buffer = new byte[1024];
            int bytesRead = input.read(buffer);
            
            // 处理并响应
            String response = "HTTP/1.1 200 OK\r\n\r\nHello, World!";
            output.write(response.getBytes());
            
            channel.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    // 批量任务处理
    static void processBatch(List<Task> tasks) {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var futures = tasks.stream()
                .map(task -> executor.submit(() -> processTask(task)))
                .toList();
            
            // 等待所有完成
            futures.forEach(f -> {
                try { f.get(); } catch (Exception e) { e.printStackTrace(); }
            });
        }
    }
    
    static Result processTask(Task task) {
        // I/O 密集型任务处理
        return new Result(task.id(), "processed");
    }
}

record Task(int id, String data) {}
record Result(int id, String status) {}
```

### 14.2 Sequenced Collections

新的集合接口，提供统一的顺序访问方法。

```java
import java.util.*;

public class SequencedCollectionDemo {
    public static void main(String[] args) {
        // SequencedCollection 接口提供的方法：
        // - addFirst(E e)
        // - addLast(E e)
        // - getFirst()
        // - getLast()
        // - removeFirst()
        // - removeLast()
        // - reversed()
        
        // ArrayList 实现 SequencedCollection
        ArrayList<String> list = new ArrayList<>();
        list.add("A");
        list.add("B");
        list.add("C");
        
        // 新方法
        list.addFirst("First");
        list.addLast("Last");
        
        System.out.println("List: " + list); // [First, A, B, C, Last]
        System.out.println("First: " + list.getFirst()); // First
        System.out.println("Last: " + list.getLast());   // Last
        
        // 反转视图（不修改原集合）
        List<String> reversed = list.reversed();
        System.out.println("Reversed: " + reversed); // [Last, C, B, A, First]
        
        // LinkedList
        LinkedList<Integer> linkedList = new LinkedList<>();
        linkedList.addFirst(1);
        linkedList.addLast(2);
        
        // LinkedHashSet（SequencedSet）
        LinkedHashSet<String> set = new LinkedHashSet<>();
        set.add("a");
        set.add("b");
        set.add("c");
        
        System.out.println("Set first: " + set.getFirst()); // a
        System.out.println("Set last: " + set.getLast());   // c
        
        // TreeMap（SequencedMap）
        TreeMap<String, Integer> map = new TreeMap<>();
        map.put("a", 1);
        map.put("b", 2);
        map.put("c", 3);
        
        System.out.println("Map first key: " + map.firstKey());
        System.out.println("Map last key: " + map.lastKey());
        System.out.println("Map reversed: " + map.reversed());
        
        // 集合遍历增强
        for (String s : list.reversed()) {
            System.out.println(s);
        }
    }
}
```

### 14.3 Pattern Matching for Switch 正式版

```java
// Sealed Class exhaustive switch 示例
// sealed interface 必须在类外部定义
sealed interface Shape permits Circle, Rectangle {}
record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}

public class PatternMatchingSwitchFinalDemo {
    public static void main(String[] args) {
        // 正式可用
        Object obj = "Hello";
        
        String result = switch (obj) {
            case Integer i -> "Integer: " + i;
            case String s  -> "String length: " + s.length();
            case null      -> "null";
            default        -> "Unknown type";
        };
        
        System.out.println(result);
        
        // 完整示例：处理不同类型的数据
        Data data = new TextData("Hello World");
        process(data);
        
        Shape shape = new Circle(5);
        
        // 不需要 default，编译器知道所有可能
        double area = switch (shape) {
            case Circle(double r)    -> Math.PI * r * r;
            case Rectangle(double w, double h) -> w * h;
        };
        
        System.out.println("Area: " + area);
        
        // 带守卫条件
        Object value = 150;
        
        String category = switch (value) {
            case Integer i && i < 0   -> "Negative";
            case Integer i && i < 100 -> "Small positive";
            case Integer i && i < 1000 -> "Medium positive";
            case Integer i            -> "Large positive";
            default                   -> "Not an integer";
        };
        
        System.out.println("Category: " + category);
    }
    
    static void process(Data data) {
        switch (data) {
            case TextData(String text) -> 
                System.out.println("Text: " + text);
            case NumericData(double value) -> 
                System.out.println("Numeric: " + value);
            case ListData(List<?> items) -> 
                System.out.println("List size: " + items.size());
        }
    }
}

sealed interface Data permits TextData, NumericData, ListData {}
record TextData(String text) implements Data {}
record NumericData(double value) implements Data {}
record ListData(List<?> items) implements Data {}
```

### 14.4 String Templates（预览）

```java
public class StringTemplateDemo {
    // JDK 21 预览，JDK 23 正式
    public static void main(String[] args) {
        String name = "Alice";
        int age = 25;
        
        // 传统字符串拼接
        String old = "Hello, " + name + "! You are " + age + " years old.";
        
        // String Template（STR 模板处理器）
        String newStr = STR."Hello, \{name}! You are \{age} years old.";
        
        // FMT 模板处理器（格式化）
        double price = 99.99;
        String formatted = FMT."Price: %.2f\{price}";
        
        // 嵌入表达式
        int x = 10, y = 20;
        String calculation = STR."Result: \{x + y}";
        
        // 安全的 SQL 模板
        String userId = "user123";
        // String query = STR."SELECT * FROM users WHERE id = \{userId}";
        // 注意：实际 SQL 需要使用 PreparedStatement
        
        // JSON 构建
        String json = STR."""
            {
                "name": "\{name}",
                "age": \{age}
            }
            """;
        
        System.out.println(newStr);
        System.out.println(formatted);
        System.out.println(calculation);
        System.out.println(json);
    }
}
```

---

## 十五、版本选择建议

### LTS 版本

| 版本 | 发布时间 | 支持期限 | 推荐场景 |
|------|----------|----------|----------|
| JDK 8 | 2014-03 | 至 2030年 | 传统系统维护 |
| JDK 11 | 2018-09 | 至 2026年 | 企业级应用 |
| JDK 17 | 2021-09 | 至 2029年 | 新项目推荐 |
| JDK 21 | 2023-09 | 至 2031年 | 最新 LTS |

### 特性演进路线

```mermaid
graph LR
    A[JDK 8] -->|Lambda, Stream, Optional| B[JDK 9]
    B -->|模块化, JShell| C[JDK 10]
    C -->|var 关键字| D[JDK 11]
    D -->|HTTP Client, 新 String 方法| E[JDK 12]
    E -->|Switch 表达式预览| F[JDK 13]
    F -->|文本块预览| G[JDK 14]
    G -->|Records 预览, PM instanceof 预览| H[JDK 15]
    H -->|文本块正式| I[JDK 16]
    I -->|Records 正式, PM instanceof 正式| J[JDK 17]
    J -->|Sealed Classes 正式| K[JDK 18]
    K -->|UTF-8 默认, Simple Web Server| L[JDK 19]
    L -->|Virtual Threads 预览| M[JDK 20]
    M -->|Record Patterns 预览| N[JDK 21]
    N -->|Virtual Threads 正式<br>Sequenced Collections| O[JDK 21 LTS]
```

### 各版本迁移建议

#### JDK 8 → JDK 11

- 利用新的 String 方法简化代码
- 使用新的 HTTP Client 替代 HttpURLConnection
- 使用 var 减少冗余代码

#### JDK 11 → JDK 17

- 使用 Records 替代简单的数据类
- 使用 Pattern Matching 简化类型检查
- 使用 Sealed Classes 控制继承范围

#### JDK 17 → JDK 21

- 使用 Virtual Threads 提升并发性能
- 使用 Sequenced Collections 统一集合操作
- 使用完整的 Pattern Matching for Switch

---

## 十六、总结

JDK 从 8 到 21 的演进历程展示了 Java 的持续创新：

1. **JDK 8** - 函数式编程革命
2. **JDK 9-10** - 模块化与类型推断
3. **JDK 11** - HTTP Client 与字符串增强
4. **JDK 12-14** - Switch 表达式与 Records 预览
5. **JDK 15-16** - 文本块与 Records 正式
6. **JDK 17** - Sealed Classes 正式，第二个 LTS
7. **JDK 18-19** - UTF-8 默认与 Virtual Threads 预览
8. **JDK 21** - Virtual Threads 正式，第三个 LTS

对于新项目，推荐使用 **JDK 21** LTS 版本，享受最新的语言特性和性能优化。对于遗留系统，可逐步迁移到 **JDK 17** LTS 作为过渡版本。

---


## 参考资料

- [Oracle JDK 官方文档](https://docs.oracle.com/en/java/javase/)
- [OpenJDK 项目](https://openjdk.org/)
- [JDK Enhancement Proposals (JEPs)](https://openjdk.org/jeps/)
- [Java 版本特性速查](https://javaalmanac.io/)
