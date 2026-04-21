---
title: "Maven settings.xml 配置详解"
description: "详解 Maven settings.xml 配置文件的各个标签含义、常用配置示例及最佳实践"
date: 2026-04-21
tags: ["maven", "java", "configuration"]
draft: false
---

## 文件位置

Maven settings.xml 文件有两个位置：

| 类型 | 路径 | 作用范围 |
| --- | --- | --- |
| 全局配置 | `${MAVEN_HOME}/conf/settings.xml` | 所有用户 |
| 用户配置 | `~/.m2/settings.xml` | 当前用户 |

**优先级**：用户配置覆盖全局配置。如果两个文件都存在，Maven 会合并它们，用户配置优先。

**推荐**：使用用户级别的配置文件，避免修改全局配置。

## 基本结构

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                              http://maven.apache.org/xsd/settings-1.0.0.xsd">

  <!-- 本地仓库路径 -->
  <localRepository/>

  <!-- 是否交互模式 -->
  <interactiveMode/>

  <!-- 是否离线模式 -->
  <offline/>

  <!-- 插件组 -->
  <pluginGroups/>

  <!-- 代理配置 -->
  <proxies/>

  <!-- 服务器认证 -->
  <servers/>

  <!-- 镜像配置 -->
  <mirrors/>

  <!-- 环境配置 -->
  <profiles/>

  <!-- 激活的 Profile -->
  <activeProfiles/>
</settings>
```

## 标签详解

### localRepository

指定本地仓库的存储路径，默认为 `~/.m2/repository`。

```xml
<settings>
  <!-- 自定义本地仓库路径 -->
  <localRepository>/path/to/local/repo</localRepository>
</settings>
```

**应用场景**：
- 磁盘空间不足，需要将仓库放到其他磁盘
- 多个项目共享同一个本地仓库
- CI/CD 环境中统一管理依赖缓存

### interactiveMode

是否启用交互模式，默认为 `true`。

```xml
<interactiveMode>false</interactiveMode>
```

**应用场景**：CI/CD 环境中禁用交互，避免构建过程中需要用户输入。

### offline

是否启用离线模式，默认为 `false`。

```xml
<offline>true</offline>
```

**应用场景**：
- 网络受限环境
- 所有依赖已下载到本地，无需联网

### pluginGroups

定义插件组，当使用简短命令时 Maven 会搜索这些组。

```xml
<pluginGroups>
  <pluginGroup>org.apache.maven.plugins</pluginGroup>
  <pluginGroup>org.codehaus.mojo</pluginGroup>
  <pluginGroup>com.example.plugins</pluginGroup>
</pluginGroups>
```

**效果**：执行 `mvn compiler:compile` 时，Maven 会依次搜索以上组中的 `maven-compiler-plugin`。

### proxies

配置 HTTP 代理，用于访问远程仓库。

```xml
<proxies>
  <proxy>
    <id>my-proxy</id>
    <active>true</active>
    <protocol>http</protocol>
    <host>proxy.example.com</host>
    <port>8080</port>
    <username>proxyuser</username>
    <password>proxypass</password>
    <!-- 不使用代理的地址 -->
    <nonProxyHosts>localhost|127.0.0.1|*.internal.com</nonProxyHosts>
  </proxy>
</proxies>
```

| 标签 | 说明 |
| --- | --- |
| `id` | 代理唯一标识 |
| `active` | 是否激活 |
| `protocol` | 协议类型：`http`、`https`、`ftp` |
| `host` | 代理服务器地址 |
| `port` | 代理端口 |
| `username` | 认证用户名（可选） |
| `password` | 认证密码（可选） |
| `nonProxyHosts` | 不走代理的地址列表，用 `|` 分隔 |

### servers

配置服务器认证信息，用于部署到远程仓库或访问私有仓库。

```xml
<servers>
  <!-- 私有仓库认证 -->
  <server>
    <id>private-repo</id>
    <username>repo-user</username>
    <password>repo-password</password>
  </server>

  <!-- 使用加密密码 -->
  <server>
    <id>encrypted-repo</id>
    <username>repo-user</username>
    <!-- 使用 mvn -ep 命令加密 -->
    <password>{COQLCE6DU6GZol1M6I8hX8ER9pB=}</password>
  </server>

  <!-- SSH 私钥认证 -->
  <server>
    <id>ssh-server</id>
    <username>git-user</username>
    <privateKey>${user.home}/.ssh/id_rsa</privateKey>
    <passphrase>ssh-key-password</passphrase>
  </server>

  <!-- GPG 签名配置 -->
  <server>
    <id>gpg.passphrase</id>
    <passphrase>your-gpg-passphrase</passphrase>
  </server>
</servers>
```

| 标签 | 说明 |
| --- | --- |
| `id` | 服务器标识，与 `pom.xml` 中 `distributionManagement` 的 `repository.id` 对应 |
| `username` | 登录用户名 |
| `password` | 登录密码（建议加密） |
| `privateKey` | SSH 私钥路径 |
| `passphrase` | 私钥密码 |

**密码加密**：

```bash
# 加密主密码
mvn --encrypt-master-password <master-password>

# 加密服务器密码
mvn --encrypt-password <password>
```

加密后的密码存储在 `~/.m2/settings-security.xml`：

```xml
<settingsSecurity>
  <master>{加密后的主密码}</master>
</settingsSecurity>
```

### mirrors

配置仓库镜像，用于加速下载或访问私有仓库。

```xml
<mirrors>
  <!-- 阿里云公共镜像 -->
  <mirror>
    <id>aliyun-public</id>
    <name>Aliyun Public Mirror</name>
    <url>https://maven.aliyun.com/repository/public</url>
    <mirrorOf>central</mirrorOf>
  </mirror>

  <!-- 阿里云全量镜像 -->
  <mirror>
    <id>aliyun-all</id>
    <name>Aliyun All Mirror</name>
    <url>https://maven.aliyun.com/repository/public</url>
    <!-- 匹配所有仓库 -->
    <mirrorOf>*</mirrorOf>
  </mirror>

  <!-- 排除某些仓库 -->
  <mirror>
    <id>aliyun-exclude</id>
    <name>Aliyun Mirror (Exclude Internal)</name>
    <url>https://maven.aliyun.com/repository/public</url>
    <!-- 排除 internal-repo，其他都走镜像 -->
    <mirrorOf>*,!internal-repo</mirrorOf>
  </mirror>

  <!-- 只匹配特定仓库 -->
  <mirror>
    <id>aliyun-specific</id>
    <name>Aliyun Specific Mirror</name>
    <url>https://maven.aliyun.com/repository/public</url>
    <mirrorOf>central,spring-milestones</mirrorOf>
  </mirror>
</mirrors>
```

| 标签 | 说明 |
| --- | --- |
| `id` | 镜像唯一标识 |
| `name` | 镜像名称（描述性） |
| `url` | 镜像地址 |
| `mirrorOf` | 被镜像的仓库 ID |

**mirrorOf 常用值**：

| 值 | 说明 |
| --- | --- |
| `central` | 只镜像 Maven 中央仓库 |
| `*` | 镜像所有仓库 |
| `external:*` | 镜像所有外部仓库（排除 localhost 和 file://） |
| `repo1,repo2` | 镜像多个指定仓库 |
| `*,!repo-id` | 镜像所有仓库，排除指定仓库 |

**常用国内镜像**：

```xml
<!-- 阿里云 -->
<url>https://maven.aliyun.com/repository/public</url>

<!-- 华为云 -->
<url>https://repo.huaweicloud.com/repository/maven/</url>

<!-- 腾讯云 -->
<url>https://mirrors.cloud.tencent.com/nexus/repository/maven-public/</url>
```

### profiles

定义一组配置，可包含属性、仓库、插件仓库等。

```xml
<profiles>
  <profile>
    <id>development</id>

    <!-- 自定义属性 -->
    <properties>
      <db.url>jdbc:mysql://localhost:3306/dev</db.url>
      <db.username>dev-user</db.username>
      <db.password>dev-password</db.password>
    </properties>

    <!-- 依赖仓库 -->
    <repositories>
      <repository>
        <id>spring-milestones</id>
        <name>Spring Milestones</name>
        <url>https://repo.spring.io/milestone</url>
        <releases>
          <enabled>true</enabled>
          <updatePolicy>daily</updatePolicy>
          <checksumPolicy>warn</checksumPolicy>
        </releases>
        <snapshots>
          <enabled>false</enabled>
        </snapshots>
      </repository>

      <repository>
        <id>company-repo</id>
        <name>Company Repository</name>
        <url>https://nexus.company.com/repository/maven-public/</url>
        <releases>
          <enabled>true</enabled>
        </releases>
        <snapshots>
          <enabled>true</enabled>
          <updatePolicy>always</updatePolicy>
        </snapshots>
      </repository>
    </repositories>

    <!-- 插件仓库 -->
    <pluginRepositories>
      <pluginRepository>
        <id>spring-plugins</id>
        <name>Spring Plugins</name>
        <url>https://repo.spring.io/plugins-release</url>
        <releases>
          <enabled>true</enabled>
        </releases>
        <snapshots>
          <enabled>false</enabled>
        </snapshots>
      </pluginRepository>
    </pluginRepositories>
  </profile>

  <profile>
    <id>production</id>
    <properties>
      <db.url>jdbc:mysql://prod-db.company.com:3306/prod</db.url>
      <db.username>prod-user</db.username>
      <db.password>prod-password</db.password>
    </properties>
  </profile>
</profiles>
```

**仓库配置详解**：

| 标签 | 说明 |
| --- | --- |
| `id` | 仓库唯一标识 |
| `name` | 仓库名称 |
| `url` | 仓库地址 |
| `releases.enabled` | 是否下载 RELEASE 版本 |
| `snapshots.enabled` | 是否下载 SNAPSHOT 版本 |
| `updatePolicy` | 更新频率：`always`、`daily`、`interval:X`、`never` |
| `checksumPolicy` | 校验策略：`ignore`、`warn`、`fail` |

### activeProfiles

激活指定的 Profile。

```xml
<!-- 方式一：显式激活 -->
<activeProfiles>
  <activeProfile>development</activeProfile>
</activeProfiles>
```

也可以在 Profile 内通过条件激活：

```xml
<profile>
  <id>linux-profile</id>
  <!-- 激活条件 -->
  <activation>
    <!-- 根据操作系统 -->
    <os>
      <name>Linux</name>
      <family>unix</family>
      <arch>amd64</arch>
    </os>

    <!-- 根据系统属性 -->
    <property>
      <name>env</name>
      <value>dev</value>
    </property>

    <!-- 根据文件存在 -->
    <file>
      <exists>${basedir}/src/main/resources/dev.properties</exists>
      <missing>${basedir}/src/main/resources/prod.properties</missing>
    </file>

    <!-- 默认激活 -->
    <activeByDefault>true</activeByDefault>
  </activation>
</profile>
```

**命令行激活**：

```bash
# 激活指定 Profile
mvn clean install -Pdevelopment

# 激活多个 Profile
mvn clean install -Pdevelopment,production

# 使用属性激活
mvn clean install -Denv=dev
```

## 完整配置示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                              http://maven.apache.org/xsd/settings-1.0.0.xsd">

  <!-- 本地仓库 -->
  <localRepository>${user.home}/.m2/repository</localRepository>

  <!-- 交互模式 -->
  <interactiveMode>true</interactiveMode>

  <!-- 离线模式 -->
  <offline>false</offline>

  <!-- 插件组 -->
  <pluginGroups>
    <pluginGroup>org.apache.maven.plugins</pluginGroup>
    <pluginGroup>org.codehaus.mojo</pluginGroup>
  </pluginGroups>

  <!-- 代理配置 -->
  <proxies>
    <proxy>
      <id>optional-proxy</id>
      <active>false</active>
      <protocol>http</protocol>
      <host>proxy.company.com</host>
      <port>8080</port>
      <nonProxyHosts>localhost|*.internal.com</nonProxyHosts>
    </proxy>
  </proxies>

  <!-- 服务器认证 -->
  <servers>
    <server>
      <id>company-releases</id>
      <username>deploy-user</username>
      <password>{加密密码}</password>
    </server>
    <server>
      <id>company-snapshots</id>
      <username>deploy-user</username>
      <password>{加密密码}</password>
    </server>
  </servers>

  <!-- 镜像配置 -->
  <mirrors>
    <mirror>
      <id>aliyun-maven</id>
      <mirrorOf>central</mirrorOf>
      <name>Aliyun Maven Mirror</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>

  <!-- Profile 配置 -->
  <profiles>
    <profile>
      <id>development</id>
      <properties>
        <deploy.repo>company-snapshots</deploy.repo>
      </properties>
      <repositories>
        <repository>
          <id>company-repo</id>
          <url>https://nexus.company.com/repository/maven-public/</url>
        </repository>
      </repositories>
    </profile>

    <profile>
      <id>production</id>
      <properties>
        <deploy.repo>company-releases</deploy.repo>
      </properties>
    </profile>
  </profiles>

  <!-- 激活 Profile -->
  <activeProfiles>
    <activeProfile>development</activeProfile>
  </activeProfiles>

</settings>
```

## settings.xml 与 pom.xml 的区别

| 配置项 | settings.xml | pom.xml |
| --- | --- |
| 作用范围 | 用户全局 / 系统全局 | 当前项目 |
| 适用场景 | 通用配置（镜像、认证） | 项目特定配置 |
| 分发方式 | 不随项目分发 | 随项目分发 |
| 配置内容 | 仓库、认证、镜像、Profile | 依赖、构建、插件 |

**原则**：
- 需要保密的信息（密码、私钥）放在 `settings.xml`
- 项目级别的配置放在 `pom.xml`
- 团队共享的配置放在父 `pom.xml`

## 常见配置场景

### 场景一：公司私有 Nexus 仓库

```xml
<settings>
  <servers>
    <server>
      <id>nexus-releases</id>
      <username>deployment</username>
      <password>deployment123</password>
    </server>
    <server>
      <id>nexus-snapshots</id>
      <username>deployment</username>
      <password>deployment123</password>
    </server>
  </servers>

  <mirrors>
    <mirror>
      <id>nexus</id>
      <mirrorOf>*</mirrorOf>
      <url>https://nexus.company.com/repository/maven-public/</url>
    </mirror>
  </mirrors>

  <profiles>
    <profile>
      <id>nexus</id>
      <repositories>
        <repository>
          <id>central</id>
          <url>https://nexus.company.com/repository/maven-central/</url>
        </repository>
        <repository>
          <id>nexus-releases</id>
          <url>https://nexus.company.com/repository/maven-releases/</url>
        </repository>
        <repository>
          <id>nexus-snapshots</id>
          <url>https://nexus.company.com/repository/maven-snapshots/</url>
          <snapshots>
            <enabled>true</enabled>
          </snapshots>
        </repository>
      </repositories>
    </profile>
  </profiles>

  <activeProfiles>
    <activeProfile>nexus</activeProfile>
  </activeProfiles>
</settings>
```

对应 `pom.xml`：

```xml
<project>
  <distributionManagement>
    <repository>
      <id>nexus-releases</id>
      <url>https://nexus.company.com/repository/maven-releases/</url>
    </repository>
    <snapshotRepository>
      <id>nexus-snapshots</id>
      <url>https://nexus.company.com/repository/maven-snapshots/</url>
    </snapshotRepository>
  </distributionManagement>
</project>
```

### 场景二：开发环境与生产环境切换

```xml
<settings>
  <profiles>
    <profile>
      <id>dev</id>
      <activation>
        <activeByDefault>true</activeByDefault>
      </activation>
      <properties>
        <env>dev</env>
        <db.host>localhost</db.host>
        <db.port>3306</db.port>
      </properties>
    </profile>

    <profile>
      <id>prod</id>
      <properties>
        <env>prod</env>
        <db.host>prod-db.company.com</db.host>
        <db.port>3306</db.port>
      </properties>
    </profile>
  </profiles>
</settings>
```

在 `pom.xml` 中引用：

```xml
<build>
  <resources>
    <resource>
      <directory>src/main/resources</directory>
      <filtering>true</filtering>
    </resource>
  </resources>
</build>
```

`application.properties`：

```properties
db.url=jdbc:mysql://${db.host}:${db.port}/mydb
```

### 场景三：JDK 版本切换

```xml
<settings>
  <profiles>
    <profile>
      <id>jdk-8</id>
      <activation>
        <jdk>1.8</jdk>
      </activation>
      <properties>
        <maven.compiler.source>1.8</maven.compiler.source>
        <maven.compiler.target>1.8</maven.compiler.target>
      </properties>
    </profile>

    <profile>
      <id>jdk-17</id>
      <activation>
        <jdk>17</jdk>
      </activation>
      <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
      </properties>
    </profile>
  </profiles>
</settings>
```

## 调试技巧

### 查看有效配置

```bash
# 显示有效 settings.xml
mvn help:effective-settings

# 显示有效 POM（包含 settings 合入的配置）
mvn help:effective-pom

# 显示当前激活的 Profile
mvn help:active-profiles
```

### 查看配置来源

```bash
# 详细输出
mvn help:effective-settings -X | grep "settings.xml"
```

### 验证镜像配置

```bash
# 查看实际使用的仓库
mvn dependency:resolve -X | grep "repository"
```

## 最佳实践

1. **安全性**
   - 密码加密存储，不要明文写在 `settings.xml`
   - `settings-security.xml` 单独管理主密码
   - 私钥文件权限设置为 600

2. **模块化**
   - 按环境拆分 Profile（dev、test、prod）
   - 按仓库类型拆分 Profile（公司仓库、第三方仓库）
   - 使用 `activeByDefault` 设置默认配置

3. **团队协作**
   - 团队共享基础配置模板
   - 个人配置（认证信息）单独管理
   - 不要将 `settings.xml` 提交到版本控制

4. **镜像策略**
   - 公司内部仓库不要走镜像
   - 使用 `mirrorOf` 的排除语法：`*,!internal-repo`
   - 多个镜像时，Maven 只使用第一个匹配的

5. **仓库管理**
   - 定期清理本地仓库：`mvn dependency:purge-local-repository`
   - 控制仓库数量，避免依赖分散
   - RELEASE 和 SNAPSHOT 分开配置

## 参考资源

- [Maven Settings 官方文档](https://maven.apache.org/settings.html)
- [Maven Settings Schema](https://maven.apache.org/xsd/settings-1.0.0.xsd)
- [密码加密指南](https://maven.apache.org/guides/mini/guide-encryption.html)