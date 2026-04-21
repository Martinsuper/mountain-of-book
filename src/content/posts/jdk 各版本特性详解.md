---
title: "JDK 各版本特性详解：从 JDK 8 到 JDK 21"
description: "详细介绍 JDK 8 到 JDK 21 各版本的重要特性，包括 Lambda、Stream、模块化、Records、Virtual Threads 等，并提供丰富的代码示例"
date: 2026-04-21
tags: ["java", "jdk", "jdk-features", "java-version"]
draft: false
---

## 引言

Java 作为一门成熟且持续演进的编程语言，从 JDK 8 开始进入了快速迭代的时代。每六个月发布一个新版本，带来了大量现代化特性。本文将详细介绍从 JDK 8 到 JDK 21 各版本的重要特性，并通过代码示例展示其实际应用。

## JDK 版本特性总览

### 核心特性一览表

| 版本 | 发布时间 | 类型 | 核心特性 |
|------|----------|------|----------|
| JDK 8 | 2014-03 | LTS | **Lambda 表达式**<br>**Stream API**<br>**Optional 类**<br>**新日期时间 API**<br>**接口默认方法** |
| JDK 9 | 2017-09 | 非LTS | **模块化系统(Jigsaw)**<br>**JShell 交互式工具**<br>**集合工厂方法**<br>**接口私有方法**<br>**Stream API 增强** |
| JDK 10 | 2018-03 | 非LTS | **var 局部变量类型推断**<br>**不可变集合增强**<br>**Parallel GC 改进** |
| JDK 11 | 2018-09 | LTS | **HTTP Client API**<br>**字符串新方法**<br>**文件读写便捷方法**<br>**运行单文件程序** |
| JDK 12 | 2019-03 | 非LTS | **Switch 表达式(预览)**<br>**CompactNumberFormat**<br>**JVM 常量 API** |
| JDK 13 | 2019-09 | 非LTS | **文本块(预览)**<br>**Switch 表达式增强(yield)**<br>**动态 CDS 归档** |
| JDK 14 | 2020-03 | 非LTS | **Records(预览)**<br>**Pattern Matching for instanceof(预览)**<br>**改进的 NPE 信息** |
| JDK 15 | 2020-09 | 非LTS | **文本块(正式)**<br>**Sealed Classes(预览)**<br>**Hidden Classes** |
| JDK 16 | 2021-03 | 非LTS | **Records(正式)**<br>**Pattern Matching for instanceof(正式)**<br>**Vector API(孵化)** |
| JDK 17 | 2021-09 | LTS | **Sealed Classes(正式)**<br>**Pattern Matching for Switch(预览)**<br>**强封装 JDK API** |
| JDK 18 | 2022-03 | 非LTS | **UTF-8 默认编码**<br>**Simple Web Server**<br>**@snippet Javadoc 标签** |
| JDK 19 | 2022-09 | 非LTS | **Virtual Threads(预览)**<br>**Structured Concurrency(预览)**<br>**Record Patterns(预览)** |
| JDK 20 | 2023-03 | 非LTS | **Virtual Threads(第二次预览)**<br>**Record Patterns(第二次预览)**<br>**Scoped Values(预览)** |
| JDK 21 | 2023-09 | LTS | **Virtual Threads(正式)**<br>**Sequenced Collections**<br>**Pattern Matching for Switch(正式)**<br>**String Templates(预览)** |

### LTS 版本对比表

| LTS 版本 | 发布时间 | 支持截止 | 推荐使用场景 |
|----------|----------|----------|--------------|
| JDK 8 | 2014-03 | 2030-12 | 传统企业系统维护、遗留系统 |
| JDK 11 | 2018-09 | 2026-09 | 企业级应用、微服务架构 |
| JDK 17 | 2021-09 | 2029-09 | 新项目推荐、云原生应用 |
| JDK 21 | 2023-09 | 2031-09 | 最新 LTS、高并发应用 |

### 重要特性分类

| 特性类别 | 相关版本 | 特性名称 | 主要用途 |
|----------|----------|----------|----------|
| **函数式编程** | JDK 8 | Lambda、Stream | 简化代码、集合操作 |
| **类型推断** | JDK 10 | var | 减少冗余代码 |
| **数据类** | JDK 14-16 | Records | 简洁的数据载体 |
| **并发编程** | JDK 19-21 | Virtual Threads | 高并发、轻量级线程 |
| **模式匹配** | JDK 14-21 | instanceof/Switch PM | 类型检查简化 |
| **模块化** | JDK 9 | Jigsaw | 依赖管理、安全性 |
| **字符串处理** | JDK 11-15 | 新方法/文本块 | 多行文本、格式化 |
| **集合增强** | JDK 9-21 | 工厂方法/Sequenced | 便捷创建、顺序访问 |

---

## 详细特性介绍

## 一、JDK 8 (2014年3月) - Java 语言的革命性更新

JDK 8 是 Java 历史上最重要的版本之一，引入了函数式编程范式，彻底改变了 Java 的编码风格。

### JDK 8 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **Lambda 表达式** | 正式 | 函数式编程，简化匿名内部类 | ⭐⭐⭐⭐⭐ |
| **Stream API** | 正式 | 集合的函数式操作，支持链式调用和并行处理 | ⭐⭐⭐⭐⭐ |
| **Optional 类** | 正式 | 安全的空值处理，避免 NPE | ⭐⭐⭐⭐ |
| **新日期时间 API** | 正式 | java.time 包，线程安全、设计合理 | ⭐⭐⭐⭐ |
| **接口默认方法** | 正式 | 接口可定义默认实现，支持接口演进 | ⭐⭐⭐ |

### 1.1 Lambda 表达式

Lambda 表达式让 Java 支持函数式编程，代码更加简洁优雅。

```java
import java.util.*;

public class LambdaDemo {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David");
        
        // 传统方式：匿名内部类
        Collections.sort(names, new Comparator<String>() {
            @Override
            public int compare(String a, String b) {
                return a.compareTo(b);
            }
        });
        
        // Lambda 表达式方式
        Collections.sort(names, (a, b) -> a.compareTo(b));
        
        // 更简洁的写法
        Collections.sort(names, String::compareTo);
        
        // 遍历集合
        names.forEach(name -> System.out.println(name));
        names.forEach(System.out::println);
    }
}
```

### 1.2 Stream API

Stream API 提供了对集合进行函数式操作的能力，支持链式调用和并行处理。

```java
import java.util.*;
import java.util.stream.*;

public class StreamDemo {
    public static void main(String[] args) {
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        
        // 过滤偶数并求和
        int sum = numbers.stream()
            .filter(n -> n % 2 == 0)   // 过滤偶数
            .mapToInt(n -> n * n)       // 平方
            .sum();                     // 求和
        System.out.println("偶数平方和: " + sum); // 220
        
        // 并行流处理
        long count = numbers.parallelStream()
            .filter(n -> n > 5)
            .count();
        System.out.println("大于5的数量: " + count); // 5
        
        // 收集结果
        List<Integer> filtered = numbers.stream()
            .filter(n -> n > 3)
            .collect(Collectors.toList());
        
        // 分组操作
        Map<Boolean, List<Integer>> partitioned = numbers.stream()
            .collect(Collectors.partitioningBy(n -> n % 2 == 0));
        System.out.println("偶数: " + partitioned.get(true));
        System.out.println("奇数: " + partitioned.get(false));
        
        // 自定义聚合
        String joined = numbers.stream()
            .map(String::valueOf)
            .collect(Collectors.joining(", ", "[", "]"));
        System.out.println(joined); // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }
}
```

### 1.3 Optional 类

Optional 解决了空指针异常问题，提供了更安全的空值处理方式。

```java
import java.util.Optional;

public class OptionalDemo {
    public static void main(String[] args) {
        // 创建 Optional
        Optional<String> opt1 = Optional.of("Hello");      // 必须非空
        Optional<String> opt2 = Optional.ofNullable(null); // 可为空
        Optional<String> opt3 = Optional.empty();          // 空值
        
        // 基本操作
        if (opt1.isPresent()) {
            System.out.println(opt1.get());
        }
        
        // 推荐的函数式操作
        opt1.ifPresent(System.out::println);
        
        // 默认值
        String value = opt2.orElse("Default Value");
        String lazyValue = opt2.orElseGet(() -> "Lazy Default");
        
        // 异常处理
        String result = opt2.orElseThrow(() -> 
            new RuntimeException("Value is null"));
        
        // 转换操作
        Optional<Integer> length = opt1.map(String::length);
        Optional<String> filtered = opt1.filter(s -> s.length() > 3);
        
        // 链式调用示例
        User user = getUser();
        String email = Optional.ofNullable(user)
            .map(User::getEmail)
            .orElse("no-email@example.com");
    }
    
    static User getUser() {
        return new User("Alice", "alice@example.com");
    }
}

class User {
    private String name;
    private String email;
    
    User(String name, String email) {
        this.name = name;
        this.email = email;
    }
    
    public String getName() { return name; }
    public String getEmail() { return email; }
}
```

### 1.4 新的日期时间 API

JDK 8 引入了全新的日期时间 API，解决了旧 API 的线程安全和设计问题。

```java
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

public class DateTimeDemo {
    public static void main(String[] args) {
        // LocalDate - 日期
        LocalDate date = LocalDate.now();
        LocalDate specificDate = LocalDate.of(2024, 12, 25);
        
        System.out.println("当前日期: " + date);
        System.out.println("特定日期: " + specificDate);
        
        // 日期运算
        LocalDate nextWeek = date.plusWeeks(1);
        LocalDate lastMonth = date.minusMonths(1);
        LocalDate nextYear = date.plusYears(1);
        
        // LocalTime - 时间
        LocalTime time = LocalTime.now();
        LocalTime specificTime = LocalTime.of(14, 30, 0);
        System.out.println("当前时间: " + time);
        
        // LocalDateTime - 日期时间
        LocalDateTime dateTime = LocalDateTime.now();
        LocalDateTime specificDateTime = LocalDateTime.of(
            2024, 12, 25, 14, 30
        );
        
        // 格式化与解析
        DateTimeFormatter formatter = DateTimeFormatter
            .ofPattern("yyyy-MM-dd HH:mm:ss");
        String formatted = dateTime.format(formatter);
        LocalDateTime parsed = LocalDateTime.parse(
            "2024-12-25 14:30:00", formatter
        );
        
        // Instant - 时间戳
        Instant instant = Instant.now();
        Instant epoch = Instant.EPOCH;
        
        // Duration - 时间差
        Duration duration = Duration.between(time, specificTime);
        long hours = duration.toHours();
        long minutes = duration.toMinutes();
        
        // Period - 日期差
        Period period = Period.between(date, specificDate);
        int days = period.getDays();
        int months = period.getMonths();
        
        // 时区处理
        ZonedDateTime zoned = ZonedDateTime.now();
        ZonedDateTime tokyo = zoned.withZoneSameInstant(
            ZoneId.of("Asia/Tokyo")
        );
        
        // 时钟
        Clock clock = Clock.systemUTC();
        Instant utcInstant = clock.instant();
    }
}
```

### 1.5 接口默认方法

接口可以定义默认实现，解决了接口演进的问题。

```java
public interface DefaultMethodDemo {
    // 抽象方法
    void abstractMethod();
    
    // 默认方法
    default void defaultMethod() {
        System.out.println("默认方法实现");
    }
    
    // 静态方法
    static void staticMethod() {
        System.out.println("接口静态方法");
    }
}

class Implementation implements DefaultMethodDemo {
    @Override
    public void abstractMethod() {
        System.out.println("抽象方法实现");
    }
    
    // 可以选择重写默认方法
    @Override
    public void defaultMethod() {
        System.out.println("重写的默认方法");
    }
}

// 多接口默认方法冲突解决
interface InterfaceA {
    default void method() {
        System.out.println("InterfaceA.method");
    }
}

interface InterfaceB {
    default void method() {
        System.out.println("InterfaceB.method");
    }
}

class MultipleInterface implements InterfaceA, InterfaceB {
    @Override
    public void method() {
        // 必须显式选择
        InterfaceA.super.method();
        // 或者 InterfaceB.super.method();
        // 或者自定义实现
    }
}
```

---

## 二、JDK 9 (2017年9月) - 模块化时代

### JDK 9 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **模块化系统(Jigsaw)** | 正式 | 解决"JAR地狱"，提升安全性和可维护性 | ⭐⭐⭐⭐⭐ |
| **JShell** | 正式 | 交互式编程工具，快速测试代码片段 | ⭐⭐⭐ |
| **集合工厂方法** | 正式 | List.of/Set.of/Map.of 创建不可变集合 | ⭐⭐⭐⭐ |
| **接口私有方法** | 正式 | 接口内复用公共逻辑 | ⭐⭐⭐ |
| **Stream API 增强** | 正式 | takeWhile/dropWhile/ofNullable/iterate | ⭐⭐⭐ |

### 2.1 模块化系统 (Project Jigsaw)

JDK 9 最大的变化是引入了模块化系统，解决了"JAR地狱"问题。

```java
// module-info.java
module com.example.myapp {
    requires java.base;              // 默认必需
    requires java.sql;               // 需要 SQL 模块
    requires transitive java.logging; // 传递依赖
    
    exports com.example.api;         // 导出包
    exports com.example.internal to com.example.other; // 限定导出
    
    uses com.example.Service;        // 使用服务
    provides com.example.Service     // 提供服务
        with com.example.impl.ServiceImpl;
}

// 模块中的类
package com.example.api;

public class ApiService {
    public void process() {
        System.out.println("Processing...");
    }
}
```

### 2.2 JShell - 交互式编程工具

JShell 提供了交互式的 Java 编程环境。

```java
// 在终端中启动 jshell
// $ jshell

jshell> int x = 10
x ==> 10

jshell> int y = 20
y ==> 20

jshell> int sum = x + y
sum ==> 30

jshell> System.out.println(sum)
30

jshell> List.of(1, 2, 3, 4, 5)
$5 ==> [1, 2, 3, 4, 5]

jshell> $5.stream().filter(n -> n > 2).toList()
$6 ==> [3, 4, 5]

jshell> /save my-session.jsh    // 保存会话
jshell> /open my-session.jsh    // 打开会话
jshell> /exit                   // 退出
```

### 2.3 集合工厂方法

更便捷的不可变集合创建方式。

```java
import java.util.*;

public class CollectionFactoryDemo {
    public static void main(String[] args) {
        // 创建不可变 List
        List<String> list = List.of("a", "b", "c");
        // list.add("d"); // UnsupportedOperationException
        
        // 创建不可变 Set
        Set<Integer> set = Set.of(1, 2, 3, 4);
        // Set.of(1, 1, 2); // IllegalArgumentException - 重复元素
        
        // 创建不可变 Map
        Map<String, Integer> map1 = Map.of("a", 1, "b", 2, "c", 3);
        
        // 使用 Map.ofEntries 创建更大的 Map
        Map<String, Integer> map2 = Map.ofEntries(
            Map.entry("a", 1),
            Map.entry("b", 2),
            Map.entry("c", 3),
            Map.entry("d", 4),
            Map.entry("e", 5)
        );
        
        // 注意：这些集合是不可变的
        // 以下操作会抛出 UnsupportedOperationException
        // list.add("d");
        // set.add(5);
        // map1.put("d", 4);
        
        // 如果需要可变集合
        List<String> mutableList = new ArrayList<>(List.of("a", "b", "c"));
        mutableList.add("d"); // 正常工作
    }
}
```

### 2.4 接口私有方法

接口可以定义私有方法用于复用代码。

```java
public interface PrivateMethodDemo {
    default void publicMethod1() {
        commonSetup();
        System.out.println("Method 1 execution");
        commonCleanup();
    }
    
    default void publicMethod2() {
        commonSetup();
        System.out.println("Method 2 execution");
        commonCleanup();
    }
    
    // 私有方法 - 公共逻辑复用
    private void commonSetup() {
        System.out.println("Common setup");
    }
    
    private void commonCleanup() {
        System.out.println("Common cleanup");
    }
    
    // 私有静态方法
    private static void staticHelper() {
        System.out.println("Static helper");
    }
}
```

### 2.5 Stream API 增强

新增了 `takeWhile`、`dropWhile`、`iterate` 等方法。

```java
import java.util.stream.*;
import java.util.Optional;

public class StreamEnhancementDemo {
    public static void main(String[] args) {
        // takeWhile - 取到条件不满足为止
        Stream<Integer> takeWhile = Stream.of(1, 2, 3, 4, 5, 6, 3, 2, 1)
            .takeWhile(n -> n < 4);
        System.out.println("takeWhile: " + takeWhile.toList()); // [1, 2, 3]
        
        // dropWhile - 丢弃到条件不满足为止
        Stream<Integer> dropWhile = Stream.of(1, 2, 3, 4, 5, 6, 3, 2, 1)
            .dropWhile(n -> n < 4);
        System.out.println("dropWhile: " + dropWhile.toList()); // [4, 5, 6, 3, 2, 1]
        
        // iterate 的重载版本 - 支持终止条件
        Stream<Integer> iterate = Stream.iterate(1, n -> n <= 10, n -> n + 1);
        System.out.println("iterate: " + iterate.toList()); // [1..10]
        
        // ofNullable - 处理可能为空的元素
        Stream<String> stream1 = Stream.ofNullable(null);
        Stream<String> stream2 = Stream.ofNullable("value");
        
        System.out.println("ofNullable(null): " + stream1.toList()); // []
        System.out.println("ofNullable(value): " + stream2.toList()); // [value]
    }
}
```

---

## 三、JDK 10 (2018年3月) - 局部变量类型推断

### JDK 10 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **var 关键字** | 正式 | 局部变量类型推断，减少冗余代码 | ⭐⭐⭐⭐ |
| **不可变集合增强** | 正式 | List.copyOf/Set.copyOf/Map.copyOf | ⭐⭐⭐ |
| **Parallel GC 改进** | 正式 | G1 GC 性能优化 | ⭐⭐⭐ |

### 3.1 var 关键字

引入 `var` 关键字，让编译器自动推断局部变量类型。

```java
import java.util.*;
import java.util.stream.*;

public class VarDemo {
    public static void main(String[] args) {
        // 基本使用
        var list = new ArrayList<String>();  // 推断为 ArrayList<String>
        var map = new HashMap<String, Integer>(); // 推断为 HashMap<String, Integer>
        var stream = list.stream();          // 推断为 Stream<String>
        
        // 在循环中使用
        for (var element : list) {
            System.out.println(element);
        }
        
        // 在 Stream 中使用
        var result = list.stream()
            .filter(s -> s.length() > 3)
            .collect(Collectors.toList());
        
        // try-with-resources
        try (var input = new Scanner(System.in)) {
            var line = input.nextLine();
        }
        
        // 注意限制
        // ❌ 不能用于字段
        // private var field; // 编译错误
        
        // ❌ 不能用于方法参数
        // public void method(var param) {} // 编译错误
        
        // ❌ 不能用于方法返回类型
        // public var getValue() {} // 编译错误
        
        // ❌ 初始化时不能为 null
        // var x = null; // 编译错误
        
        // ❌ 不能用于 Lambda 表达式
        // var func = () -> {}; // 编译错误
        
        // ✅ Lambda 返回值可以推断
        var runnable = (Runnable) () -> System.out.println("Running");
        
        // ✅ 数组可以推断
        var array = new int[]{1, 2, 3};
    }
}
```

### 3.2 不可变集合增强

新增 `copyOf` 方法，创建不可变集合的副本。

```java
import java.util.*;

public class CollectionCopyDemo {
    public static void main(String[] args) {
        // 创建可变集合
        List<String> mutableList = new ArrayList<>();
        mutableList.add("a");
        mutableList.add("b");
        
        // 创建不可变副本
        List<String> immutableCopy = List.copyOf(mutableList);
        // immutableCopy.add("c"); // UnsupportedOperationException
        
        // 与 List.of 的区别
        // List.of 直接创建新集合
        // List.copyOf 从现有集合创建副本
        
        // Set 和 Map 同样支持
        Set<Integer> setCopy = Set.copyOf(Set.of(1, 2, 3));
        Map<String, Integer> mapCopy = Map.copyOf(Map.of("a", 1));
        
        // 注意：如果原集合已经是不可变的，copyOf 可能直接返回原集合
        List<String> original = List.of("x", "y");
        List<String> copy = List.copyOf(original);
        // 可能 original == copy（同一个对象）
    }
}
```

### 3.3 Parallel GC 改进

G1 GC 成为默认垃圾收集器，Parallel GC 性能优化。

```java
// JDK 10 之前
// 默认 GC: Parallel GC (吞吐量优先)

// JDK 10+
// 默认 GC: G1 GC (平衡吞吐量和延迟)

// G1 GC 优势：
// - 更可控的停顿时间
// - 大堆内存支持
// - 并行与并发回收

// 启动参数示例
// java -XX:+UseG1GC MyApp          // 使用 G1 GC
// java -XX:+UseParallelGC MyApp    // 使用 Parallel GC
// java -XX:MaxGCPauseMillis=200    // 设置最大停顿时间
```

---

## 四、JDK 11 (2018年9月) - 长期支持版本

### JDK 11 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **HTTP Client API** | 正式 | 支持 HTTP/2 和 WebSocket，替代 HttpURLConnection | ⭐⭐⭐⭐ |
| **字符串新方法** | 正式 | strip/stripLeading/stripTrailing/isBlank/lines/repeat | ⭐⭐⭐⭐ |
| **文件读写便捷方法** | 正式 | Files.readString/writeString | ⭐⭐⭐ |
| **运行单文件程序** | 正式 | java HelloWorld.java 直接运行 | ⭐⭐⭐ |

### 4.1 HTTP Client API

全新的 HTTP Client，支持 HTTP/2 和 WebSocket。

```java
import java.net.http.*;
import java.net.URI;
import java.time.Duration;

public class HttpClientDemo {
    public static void main(String[] args) throws Exception {
        // 创建 HTTP Client
        HttpClient client = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)  // HTTP/2
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
        
        // GET 请求
        HttpRequest getRequest = HttpRequest.newBuilder()
            .uri(URI.create("https://httpbin.org/get"))
            .header("Accept", "application/json")
            .GET()
            .build();
        
        HttpResponse<String> getResponse = client.send(
            getRequest, HttpResponse.BodyHandlers.ofString()
        );
        System.out.println("GET Status: " + getResponse.statusCode());
        System.out.println("GET Body: " + getResponse.body());
        
        // POST 请求
        HttpRequest postRequest = HttpRequest.newBuilder()
            .uri(URI.create("https://httpbin.org/post"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"name\":\"test\"}"))
            .build();
        
        HttpResponse<String> postResponse = client.send(
            postRequest, HttpResponse.BodyHandlers.ofString()
        );
        System.out.println("POST Status: " + postResponse.statusCode());
        
        // 异步请求
        client.sendAsync(getRequest, HttpResponse.BodyHandlers.ofString())
            .thenApply(HttpResponse::body)
            .thenAccept(body -> System.out.println("Async: " + body))
            .join();
        
        // 并行请求
        var requests = List.of(
            HttpRequest.newBuilder().uri(URI.create("https://httpbin.org/get")).build(),
            HttpRequest.newBuilder().uri(URI.create("https://httpbin.org/ip")).build()
        );
        
        var responses = requests.stream()
            .map(req -> client.sendAsync(req, HttpResponse.BodyHandlers.ofString()))
            .toList();
        
        responses.forEach(future -> 
            System.out.println(future.join().body())
        );
    }
}
```

### 4.2 字符串新方法

新增多个实用的字符串方法。

```java
public class StringMethodsDemo {
    public static void main(String[] args) {
        String text = "  Hello World  ";
        
        // strip - 去除空白（比 trim 更智能，处理 Unicode 空白）
        String stripped = text.strip();
        String strippedLeading = text.stripLeading();
        String strippedTrailing = text.stripTrailing();
        
        System.out.println("strip: '" + stripped + "'");
        System.out.println("stripLeading: '" + strippedLeading + "'");
        System.out.println("stripTrailing: '" + strippedTrailing + "'");
        
        // isBlank - 检查是否为空白字符串
        String blank = "   ";
        System.out.println("isBlank: " + blank.isBlank()); // true
        System.out.println("isEmpty: " + blank.isEmpty()); // false
        
        // lines - 按行分割
        String multiline = "Line 1\nLine 2\nLine 3";
        multiline.lines().forEach(System.out::println);
        
        // repeat - 重复字符串
        String repeated = "abc".repeat(3);
        System.out.println("repeat: " + repeated); // abcabcabc
        
        // strip 与 trim 的区别（Unicode 空白字符）
        String unicodeSpace = "\u2003Hello\u2003"; // EM SPACE
        System.out.println("trim: '" + unicodeSpace.trim() + "'");    // 保留 Unicode 空白
        System.out.println("strip: '" + unicodeSpace.strip() + "'");  // 移除 Unicode 空白
    }
}
```

### 4.3 文件读写便捷方法

```java
import java.nio.file.*;

public class FileMethodsDemo {
    public static void main(String[] args) throws Exception {
        Path path = Path.of("test.txt");
        
        // 写文件
        Files.writeString(path, "Hello, JDK 11!\n");
        
        // 读文件
        String content = Files.readString(path);
        System.out.println(content);
        
        // 与旧 API 的对比
        // 旧方式：
        // List<String> lines = Files.readAllLines(path);
        // String content = lines.stream().collect(Collectors.joining("\n"));
        
        // 新方式：一行搞定
        String sameContent = Files.readString(path);
    }
}
```

### 4.4 运行 Java 文件

JDK 11 支持直接运行单文件 Java 程序。

```bash
# 传统方式
$ javac HelloWorld.java
$ java HelloWorld

# JDK 11 新方式 - 直接运行
$ java HelloWorld.java

# 带参数运行
$ java HelloWorld.java arg1 arg2

# 使用 --source 运行特定版本
$ java --source 11 HelloWorld.java
```

---

## 五、JDK 12 (2019年3月) - Switch 表达式预览

### JDK 12 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **Switch 表达式** | 预览 | 箭头语法，支持表达式形式 | ⭐⭐⭐⭐ |
| **CompactNumberFormat** | 正式 | 紧凑数字格式化（如 1K、1M） | ⭐⭐⭐ |

### 5.1 Switch 表达式（预览特性）

更简洁的 switch 语法，支持表达式形式。

```java
public class SwitchExpressionDemo {
    // JDK 12 预览特性，需要 --enable-preview
    public static void main(String[] args) {
        // 传统 switch
        int day = 3;
        String dayName;
        switch (day) {
            case 1:
                dayName = "Monday";
                break;
            case 2:
                dayName = "Tuesday";
                break;
            case 3:
                dayName = "Wednesday";
                break;
            default:
                dayName = "Unknown";
        }
        
        // JDK 12 新 switch 表达式（预览）
        String newDayName = switch (day) {
            case 1 -> "Monday";
            case 2 -> "Tuesday";
            case 3 -> "Wednesday";
            case 4, 5, 6, 7 -> "Weekend or other weekday";
            default -> "Unknown";
        };
        
        // 带代码块的 case
        String detailedName = switch (day) {
            case 1 -> {
                System.out.println("Processing Monday");
                yield "Monday";  // JDK 13 改为 yield
            }
            case 2 -> "Tuesday";
            default -> "Unknown";
        };
        
        System.out.println(newDayName);
    }
}
```

### 5.2 CompactNumberFormat

紧凑数字格式化。

```java
import java.text.*;
import java.util.Locale;

public class CompactNumberFormatDemo {
    public static void main(String[] args) {
        NumberFormat shortFormat = NumberFormat.getCompactNumberInstance(
            Locale.US, NumberFormat.Style.SHORT
        );
        NumberFormat longFormat = NumberFormat.getCompactNumberInstance(
            Locale.US, NumberFormat.Style.LONG
        );
        
        long number = 12345678;
        
        System.out.println("SHORT: " + shortFormat.format(number)); // 12M
        System.out.println("LONG: " + longFormat.format(number));   // 12 million
        
        // 中文
        NumberFormat chineseFormat = NumberFormat.getCompactNumberInstance(
            Locale.CHINA, NumberFormat.Style.SHORT
        );
        System.out.println("中文: " + chineseFormat.format(number)); // 1235万
    }
}
```

### 5.3 JVM 常量 API

新的 API 用于描述 class 文件常量池中的常量。

```java
import java.lang.constant.*;

public class ConstantApiDemo {
    // JVM 常量 API 主要用于编译器和字节码操作工具
    // 提供 Constable 接口和 ConstantDesc 接口
    
    public static void main(String[] args) {
        // String、Integer、Long 等实现了 Constable 接口
        String str = "Hello";
        Optional<ConstantDesc> desc = str.describeConstable();
        
        // Class 类型也支持
        Class<?> clazz = String.class;
        Optional<ConstantDesc> classDesc = clazz.describeConstable();
        
        // 主要用途：字节码生成工具（如 ASM、Byte Buddy）
        // 可以更安全地生成常量池条目
        System.out.println("ConstantDesc available: " + desc.isPresent());
    }
}
```

---

## 六、JDK 13 (2019年9月) - 文本块预览

### JDK 13 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **文本块** | 预览 | 多行字符串字面量，避免繁琐拼接 | ⭐⭐⭐⭐⭐ |
| **Switch 表达式增强** | 预览 | yield 关键字返回值 | ⭐⭐⭐⭐ |
| **动态 CDS 归档** | 正式 | 运行时归档类，提升启动速度 | ⭐⭐⭐ |

### 6.1 文本块（预览特性）

多行字符串字面量，避免繁琐的拼接。

```java
public class TextBlockDemo {
    // JDK 13 预览，JDK 15 正式
    public static void main(String[] args) {
        // 传统方式
        String htmlOld = "<html>\n" +
            "  <body>\n" +
            "    <h1>Hello, World</h1>\n" +
            "  </body>\n" +
            "</html>";
        
        // 文本块方式
        String html = """
            <html>
              <body>
                <h1>Hello, World</h1>
              </body>
            </html>
            """;
        
        String json = """
            {
                "name": "Alice",
                "age": 25,
                "email": "alice@example.com"
            }
            """;
        
        String sql = """
            SELECT id, name, email
            FROM users
            WHERE status = 'active'
            ORDER BY created_at DESC
            """;
        
        String script = """
            function hello() {
                console.log('Hello, World!');
            }
            hello();
            """;
        
        // 嵌入变量
        String name = "Alice";
        String message = """
            Hello, %s!
            Welcome to Java 13+.
            """.formatted(name);
        
        // 转义字符处理
        String escaped = """
            Line 1\nLine 2\tTabbed
            End of line: \\
            """;
        
        System.out.println(html);
        System.out.println(json);
    }
}
```

### 6.2 Switch 表达式增强(yield)

JDK 13 引入 yield 关键字，用于从 switch 表达式的代码块中返回值。

```java
public class SwitchYieldDemo {
    public static void main(String[] args) {
        int day = 3;
        
        // JDK 13+ 使用 yield 关键字
        String dayType = switch (day) {
            case 1, 7 -> {
                System.out.println("Processing weekend");
                yield "Weekend";  // yield 返回值
            }
            case 2, 3, 4, 5, 6 -> {
                String type = "Weekday";
                yield type;  // 可以 yield 变量
            }
            default -> {
                yield "Unknown";
            }
        };
        
        System.out.println("Day type: " + dayType);
        
        // yield 与箭头语法的区别
        // 箭头语法 -> "value"  直接返回单个值
        // yield 用于代码块中返回值
    }
}
```

### 6.3 动态 CDS 归档

运行时动态归档类，提升应用启动速度。

```bash
# CDS (Class Data Sharing) 是一种类数据共享机制
# JDK 13 支持在应用运行后动态创建归档

# 步骤 1：运行应用并记录使用的类
$ java -XX:ArchiveClassesAtExit=app.jsa -cp myapp.jar MyApp

# 步骤 2：使用归档启动应用（更快）
$ java -XX:SharedArchiveFile=app.jsa -cp myapp.jar MyApp

# 好处：
# - 减少类加载时间
# - 减少内存占用
# - 显著提升启动速度（可达 20-30%）
```

---

## 七、JDK 14 (2020年3月) - Records 与 Pattern Matching

### JDK 14 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **Records** | 预览 | 简洁的数据载体类，自动生成方法 | ⭐⭐⭐⭐⭐ |
| **Pattern Matching for instanceof** | 预览 | 类型检查与转换合并 | ⭐⭐⭐⭐ |
| **改进的 NPE 信息** | 正式 | 详细指出哪个变量为 null | ⭐⭐⭐⭐ |

### 7.1 Records（预览）

简洁的数据载体类，自动生成构造器、getter、equals、hashCode、toString。

```java
// JDK 14 预览，JDK 16 正式
public record Person(String name, int age, String email) {
    // 紧凑构造器 - 验证逻辑
    public Person {
        if (age < 0) {
            throw new IllegalArgumentException("Age cannot be negative");
        }
        email = email.toLowerCase(); // 规范化
    }
    
    // 额外方法
    public boolean isAdult() {
        return age >= 18;
    }
    
    // 静态方法
    public static Person createDefault() {
        return new Person("Unknown", 0, "unknown@example.com");
    }
}

public class RecordDemo {
    public static void main(String[] args) {
        Person person = new Person("Alice", 25, "ALICE@example.com");
        
        // 自动生成的 getter（注意：没有 get 前缀）
        System.out.println(person.name());   // Alice
        System.out.println(person.age());    // 25
        System.out.println(person.email());  // alice@example.com
        
        // 自动生成的 toString
        System.out.println(person); // Person[name=Alice, age=25, email=alice@example.com]
        
        // 自动生成的 equals 和 hashCode
        Person person2 = new Person("Alice", 25, "alice@example.com");
        System.out.println(person.equals(person2)); // true
        
        // 自定义方法
        System.out.println(person.isAdult()); // true
        
        // Record 是不可变的
        // person.name = "Bob"; // 编译错误
        
        // 与传统类的对比
        // 传统类需要手动编写：
        // - 构造器
        // - getter 方法
        // - equals/hashCode
        // - toString
        // - 约 50+ 行代码
        // Record 只需要：1 行
    }
}
```

### 7.2 Pattern Matching for instanceof（预览）

简化类型检查和转换。

```java
public class PatternMatchingDemo {
    // JDK 14 预览，JDK 16 正式
    public static void main(String[] args) {
        Object obj = "Hello, Pattern Matching";
        
        // 传统方式
        if (obj instanceof String) {
            String str = (String) obj;  // 显式转换
            System.out.println(str.length());
        }
        
        // Pattern Matching 方式
        if (obj instanceof String str) {  // 自动转换
            System.out.println(str.length());
            System.out.println(str.toUpperCase());
        }
        
        // 带条件
        if (obj instanceof String str && str.length() > 5) {
            System.out.println("Long string: " + str);
        }
        
        // 多类型处理
        Object value = 123;
        String result = switchValue(value);
        System.out.println(result);
    }
    
    static String switchValue(Object obj) {
        if (obj instanceof Integer i) {
            return "Integer: " + i;
        } else if (obj instanceof String s) {
            return "String: " + s;
        } else if (obj instanceof Double d) {
            return "Double: " + d;
        }
        return "Unknown type";
    }
}
```

### 7.3 更好的 NullPointerException

更详细的 NPE 信息，帮助快速定位问题。

```java
public class NPEImprovementDemo {
    public static void main(String[] args) {
        // 传统 NPE 信息
        // Exception in thread "main" java.lang.NullPointerException
        
        // JDK 14+ 更详细的 NPE 信息
        // Exception in thread "main" java.lang.NullPointerException: 
        // Cannot invoke "String.length()" because "name" is null
        
        try {
            String name = null;
            int length = name.length();
        } catch (NullPointerException e) {
            // JDK 14+ 会显示具体哪个变量为 null
            System.out.println(e.getMessage());
        }
        
        // 更复杂的场景
        try {
            User user = null;
            String email = user.getEmail().toLowerCase();
        } catch (NullPointerException e) {
            // Cannot invoke "User.getEmail()" because "user" is null
            System.out.println(e.getMessage());
        }
        
        // 需要启用：-XX:+ShowCodeDetailsInExceptionMessages（JDK 14）
        // JDK 15+ 默认启用
    }
}

// 用于 NPE 示例的 User 类
class User {
    private String email;
    public String getEmail() { return email; }
}
```

---

## 八、JDK 15 (2020年9月) - 文本块正式版

### JDK 15 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **文本块** | 正式 | 多行字符串字面量成为正式特性 | ⭐⭐⭐⭐⭐ |
| **Sealed Classes** | 预览 | 限制类的继承范围 | ⭐⭐⭐⭐ |
| **Hidden Classes** | 正式 | 动态生成的类，框架内部使用 | ⭐⭐⭐ |

### 8.1 文本块正式发布

文本块从预览特性变为正式特性。

```java
public class TextBlockFinalDemo {
    public static void main(String[] args) {
        // 正式可用，无需 --enable-preview
        
        // HTML 模板
        String html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>%s</title>
            </head>
            <body>
                <h1>%s</h1>
            </body>
            </html>
            """.formatted("My Page", "Hello");
        
        // SQL 查询
        String query = """
            SELECT u.id, u.name, u.email,
                   o.order_id, o.total_amount
            FROM users u
            JOIN orders o ON u.id = o.user_id
            WHERE u.status = 'active'
              AND o.created_at > CURRENT_DATE - INTERVAL '7 days'
            ORDER BY o.total_amount DESC
            LIMIT 10
            """;
        
        // JSON 配置
        String config = """
            {
                "database": {
                    "host": "localhost",
                    "port": 3306,
                    "name": "mydb"
                },
                "server": {
                    "port": 8080,
                    "threads": 10
                }
            }
            """;
        
        // 正则表达式（不需要过多转义）
        String regex = """
            ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
            """;
        
        // 去除尾部空白
        String stripped = """
            Line 1
            Line 2\s
            Line 3\s\s
            """.stripIndent();
        
        // 转义处理
        String escaped = """
            String text = "Hello";
            Path path = Path.of("test.txt");
            """;
    }
}
```

### 8.2 Sealed Classes（预览）

限制类的继承范围。

```java
// JDK 15 预览，JDK 17 正式
public sealed class Shape 
    permits Circle, Rectangle, Triangle {
    
    // Shape 只能被这三个类继承
}

public final class Circle extends Shape {
    private final double radius;
    
    public Circle(double radius) {
        this.radius = radius;
    }
    
    public double area() {
        return Math.PI * radius * radius;
    }
}

public final class Rectangle extends Shape {
    private final double width;
    private final double height;
    
    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }
    
    public double area() {
        return width * height;
    }
}

// non-sealed - 允许进一步继承
public non-sealed class Triangle extends Shape {
    // Triangle 可以被其他类继承
}

public class EquilateralTriangle extends Triangle {
    // 合法继承
}
```

### 8.3 Hidden Classes

隐藏类，供框架和运行时内部使用，不暴露给用户代码。

```java
import java.lang.invoke.*;

public class HiddenClassDemo {
    // Hidden Classes 主要用于框架内部（如 Lambda、反射）
    // 用户代码一般不直接使用
    
    public static void main(String[] args) throws Exception {
        // 通过 MethodHandles.Lookup 创建隐藏类
        Lookup lookup = MethodHandles.lookup();
        
        // 隐藏类特点：
        // 1. 无法通过 Class.forName() 获取
        // 2. 无法被其他类直接引用
        // 3. 生命周期可控
        // 4. 类名中包含 / 作为标识
        
        // 主要用途：
        // - Lambda 表达式实现类
        // - 动态代理生成的类
        // - 字节码框架（ASM、Byte Buddy）生成的类
        
        System.out.println("Hidden Classes 用于框架内部实现");
    }
}
```

---

## 九、JDK 16 (2021年3月) - Records 正式版

### JDK 16 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **Records** | 正式 | 数据载体类成为正式特性 | ⭐⭐⭐⭐⭐ |
| **Pattern Matching for instanceof** | 正式 | 类型检查简化成为正式特性 | ⭐⭐⭐⭐ |
| **Vector API** | 孵化 | SIMD 指令，高性能计算 | ⭐⭐⭐ |

### 9.1 Records 正式发布

Records 成为正式特性。

```java
public class RecordFinalDemo {
    public static void main(String[] args) {
        // 正式可用，无需 --enable-preview
        
        // 定义 Record
        record Point(int x, int y) {
            public double distanceTo(Point other) {
                int dx = x - other.x;
                int dy = y - other.y;
                return Math.sqrt(dx * dx + dy * dy);
            }
        }
        
        Point p1 = new Point(0, 0);
        Point p2 = new Point(3, 4);
        
        System.out.println(p1.distanceTo(p2)); // 5.0
        
        // 本地 Record（在方法内部定义）
        record LocalRecord(String name, int value) {}
        
        LocalRecord local = new LocalRecord("test", 100);
        System.out.println(local);
        
        // Record 数组
        Point[] points = {
            new Point(1, 2),
            new Point(3, 4),
            new Point(5, 6)
        };
        
        // Stream 处理
        double totalDistance = Arrays.stream(points)
            .mapToDouble(p -> Math.sqrt(p.x() * p.x() + p.y() * p.y()))
            .sum();
    }
}
```

### 9.2 Pattern Matching for instanceof 正式版

```java
public class PatternMatchingFinalDemo {
    public static void main(String[] args) {
        // 正式可用
        Object obj = "Pattern Matching";
        
        if (obj instanceof String s) {
            System.out.println(s.length());
        }
        
        // 实际应用示例
        Shape shape = new Circle(5);
        
        double area = calculateArea(shape);
        System.out.println("Area: " + area);
    }
    
    static double calculateArea(Shape shape) {
        if (shape instanceof Circle c) {
            return Math.PI * c.radius() * c.radius();
        } else if (shape instanceof Rectangle r) {
            return r.width() * r.height();
        }
        return 0;
    }
}

sealed interface Shape permits Circle, Rectangle {}
record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}
```

### 9.3 Vector API(孵化)

SIMD 指令支持，高性能数值计算。

```java
import jdk.incubator.vector.*;

public class VectorApiDemo {
    // Vector API 是孵化特性，需要 --add-modules jdk.incubator.vector
    
    public static void main(String[] args) {
        // 使用 SIMD 指令进行向量运算
        // 可以显著提升数值计算性能
        
        float[] a = new float[1000];
        float[] b = new float[1000];
        float[] c = new float[1000];
        
        // 传统方式：逐个计算
        for (int i = 0; i < a.length; i++) {
            c[i] = a[i] + b[i];
        }
        
        // Vector API 方式：批量计算（SIMD）
        // 使用 256 位向量（一次处理 8 个 float）
        FloatVector va, vb, vc;
        int vectorSize = FloatVector.SPECIES_256.length(); // 8
        
        for (int i = 0; i < a.length; i += vectorSize) {
            va = FloatVector.fromArray(FloatVector.SPECIES_256, a, i);
            vb = FloatVector.fromArray(FloatVector.SPECIES_256, b, i);
            vc = va.add(vb);
            vc.intoArray(c, i);
        }
        
        // 性能提升可达数倍（取决于 CPU SIMD 支持）
        System.out.println("Vector API 计算完成");
    }
}
```

---

## 十、JDK 17 (2021年9月) - 第二个 LTS 版本

### JDK 17 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **Sealed Classes** | 正式 | 限制继承范围，增强类型安全 | ⭐⭐⭐⭐⭐ |
| **Pattern Matching for Switch** | 预览 | switch 中的类型模式匹配 | ⭐⭐⭐⭐⭐ |
| **强封装 JDK API** | 正式 | 限制内部 API 的访问 | ⭐⭐⭐ |

### 10.1 Sealed Classes 正式版

```java
// 正式可用
public sealed class Vehicle permits Car, Truck, Motorcycle {
    private String brand;
    
    public Vehicle(String brand) {
        this.brand = brand;
    }
    
    public String getBrand() { return brand; }
}

public final class Car extends Vehicle {
    private int doors;
    
    public Car(String brand, int doors) {
        super(brand);
        this.doors = doors;
    }
    
    public int getDoors() { return doors; }
}

public final class Truck extends Vehicle {
    private double capacity;
    
    public Truck(String brand, double capacity) {
        super(brand);
        this.capacity = capacity;
    }
    
    public double getCapacity() { return capacity; }
}

public non-sealed class Motorcycle extends Vehicle {
    // 可以被进一步继承
    public Motorcycle(String brand) {
        super(brand);
    }
}

public class ElectricMotorcycle extends Motorcycle {
    private int batteryCapacity;
    
    public ElectricMotorcycle(String brand, int batteryCapacity) {
        super(brand);
        this.batteryCapacity = batteryCapacity;
    }
}
```

### 10.2 Pattern Matching for Switch（预览）

```java
public class PatternMatchingSwitchDemo {
    // JDK 17 预览，JDK 21 正式
    public static void main(String[] args) {
        Object obj = 123;
        
        String result = formatObject(obj);
        System.out.println(result);
        
        // Sealed Class 的 exhaustive 检查
        Shape shape = new Circle(5);
        String shapeInfo = describeShape(shape);
        System.out.println(shapeInfo);
    }
    
    static String formatObject(Object obj) {
        return switch (obj) {
            case Integer i -> "Integer: " + i;
            case Long l    -> "Long: " + l;
            case Double d  -> "Double: " + d;
            case String s  -> "String: " + s;
            case null      -> "null value";  // JDK 17 预览
            default        -> "Unknown: " + obj;
        };
    }
    
    static String describeShape(Shape shape) {
        // sealed class 使得 switch 不需要 default
        return switch (shape) {
            case Circle c    -> "Circle with radius " + c.radius();
            case Rectangle r -> "Rectangle " + r.width() + "x" + r.height();
        };
    }
}
```

### 10.3 强封装 JDK API

限制对 JDK 内部 API 的访问，增强安全性。

```java
// JDK 17 之前
// 可以直接访问 JDK 内部类（如 sun.misc.Unsafe）
// 但这些类可能在不同版本中改变或消失

// JDK 17+
// 默认禁止访问内部 API
// 需要显式声明才能访问

// 示例：访问 sun.misc.Unsafe
// 需要在启动时添加参数：
// --add-opens java.base/sun.misc=ALL-UNNAMED

// 常见需要显式开放的内部 API：
// sun.misc.Unsafe      - 低级别内存操作
// java.lang.reflect.Reflection - 反射内部
// com.sun.tools.javac.* - Java 编译器内部

// 迁移建议：
// 1. 使用标准 API 替代内部 API
// 2. 如必须使用，添加 --add-opens 参数
// 3. 关注 JDK 版本更新，及时迁移
```

---

## 十一、JDK 18 (2022年3月) - UTF-8 默认编码

### JDK 18 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **UTF-8 默认编码** | 正式 | 统一默认字符集为 UTF-8 | ⭐⭐⭐⭐ |
| **Simple Web Server** | 正式 | 简易 Web 服务器，jwebserver 命令 | ⭐⭐⭐ |
| **@snippet Javadoc 标签** | 正式 | 代码片段标注 | ⭐⭐⭐ |

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
| **Virtual Threads** | 预览 | 轻量级线程，高并发革命性特性 | ⭐⭐⭐⭐⭐ |
| **Structured Concurrency** | 预览 | 结构化并发，简化多任务协调 | ⭐⭐⭐⭐⭐ |
| **Record Patterns** | 预览 | Record 的解构模式匹配 | ⭐⭐⭐⭐ |

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
| **Virtual Threads** | 第二次预览 | 轻量级线程继续优化 | ⭐⭐⭐⭐⭐ |
| **Record Patterns** | 第二次预览 | Record 解构模式匹配增强 | ⭐⭐⭐⭐ |
| **Scoped Values** | 预览 | 线程内共享数据的安全机制 | ⭐⭐⭐ |

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
| **Virtual Threads** | 正式 | 轻量级线程成为正式特性 | ⭐⭐⭐⭐⭐ |
| **Sequenced Collections** | 正式 | 统一的顺序访问接口 | ⭐⭐⭐⭐ |
| **Pattern Matching for Switch** | 正式 | switch 类型模式匹配成为正式特性 | ⭐⭐⭐⭐⭐ |
| **String Templates** | 预览 | 字符串模板，简化字符串构建 | ⭐⭐⭐⭐ |

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

## 参考资源

- [Oracle JDK 官方文档](https://docs.oracle.com/en/java/javase/)
- [OpenJDK 项目](https://openjdk.org/)
- [JDK Enhancement Proposals (JEPs)](https://openjdk.org/jeps/)
- [Java 版本特性速查](https://javaalmanac.io/)
