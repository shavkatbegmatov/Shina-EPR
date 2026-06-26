# ========== BUILD STAGE ==========
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Avval dependency'lar (cache qatlami uchun)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Source + build
COPY src ./src
RUN mvn clean package -DskipTests -B

# ========== RUN STAGE ==========
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Timezone
RUN apk add --no-cache tzdata
ENV TZ=Asia/Tashkent

# Yuklangan mahsulot rasmlari papkasi — Coolify PERSISTENT VOLUME shu yerga mount qilinadi
RUN mkdir -p /data/uploads
ENV SHOP_STORAGE_DIR=/data/uploads

COPY --from=build /app/target/shina_magazin_api.jar app.jar

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8183/api/actuator/health || exit 1

EXPOSE 8183

ENTRYPOINT ["java", "-jar", \
    "-Dspring.profiles.active=prod", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-Xms256m", "-Xmx512m", \
    "app.jar"]
