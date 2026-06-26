---
title: "JDK 版本特性详解（二）：JDK 12-17 语言增强"
description: "JDK 12 到 17 的核心特性详解：Switch 表达式、文本块、Records、Pattern Matching、Sealed Classes，到 JDK 17 LTS 集大成。配代码示例。这是 JDK 8-21 特性系列的第二篇。"
date: 2026-04-21
category: "后端开发"
tags: ["java", "jdk", "jdk-features", "java-version"]
draft: false
---

## 简介

本篇是 JDK 版本特性系列的第二篇，覆盖 **JDK 12-17**——语言表达力快速增强的阶段。Switch 表达式、文本块、Records、Pattern Matching 等特性从预览走向正式，最终在 **JDK 17 LTS** 集大成。

> 系列导航：
> - [（一）JDK 8-11 现代化基础](/posts/jdk-versions-8-to-11/)
> - **（二）JDK 12-17 语言增强**（本文）
> - [（三）JDK 18-21 并发与新特性](/posts/jdk-versions-18-to-21/)

如果还不熟悉前序版本，建议先读[第一篇](/posts/jdk-versions-8-to-11/)了解 Lambda、Stream、模块化等基础特性。

---

## 五、JDK 12 (2019年3月) - Switch 表达式预览

### JDK 12 特性概览

| 特性名称 | 状态 | 功能描述 | 重要程度 |
|----------|------|----------|----------|
| **Switch 表达式** | 预览 | 箭头语法，支持表达式形式 | 高 |
| **CompactNumberFormat** | 正式 | 紧凑数字格式化（如 1K、1M） | 中 |

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
| **文本块** | 预览 | 多行字符串字面量，避免繁琐拼接 | 高 |
| **Switch 表达式增强** | 预览 | yield 关键字返回值 | 高 |
| **动态 CDS 归档** | 正式 | 运行时归档类，提升启动速度 | 中 |

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
| **Records** | 预览 | 简洁的数据载体类，自动生成方法 | 高 |
| **Pattern Matching for instanceof** | 预览 | 类型检查与转换合并 | 高 |
| **改进的 NPE 信息** | 正式 | 详细指出哪个变量为 null | 高 |

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
| **文本块** | 正式 | 多行字符串字面量成为正式特性 | 高 |
| **Sealed Classes** | 预览 | 限制类的继承范围 | 高 |
| **Hidden Classes** | 正式 | 动态生成的类，框架内部使用 | 中 |

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
| **Records** | 正式 | 数据载体类成为正式特性 | 高 |
| **Pattern Matching for instanceof** | 正式 | 类型检查简化成为正式特性 | 高 |
| **Vector API** | 孵化 | SIMD 指令，高性能计算 | 中 |

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
| **Sealed Classes** | 正式 | 限制继承范围，增强类型安全 | 高 |
| **Pattern Matching for Switch** | 预览 | switch 中的类型模式匹配 | 高 |
| **强封装 JDK API** | 正式 | 限制内部 API 的访问 | 中 |

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


## 下一篇

继续阅读 [JDK 版本特性详解（三）：JDK 18-21 并发与新特性](/posts/jdk-versions-18-to-21/)，了解 Virtual Threads、Sequenced Collections 等特性，以及完整的版本选择建议。

## 参考资料

- [Oracle JDK 官方文档](https://docs.oracle.com/en/java/javase/)
- [OpenJDK 项目](https://openjdk.org/)
- [JDK Enhancement Proposals (JEPs)](https://openjdk.org/jeps/)
