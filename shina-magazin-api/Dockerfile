# ========== BUILD STAGE ==========
FROM maven:3-eclipse-temurin-26-alpine AS build
WORKDIR /app

# Avval dependency'lar (cache qatlami uchun)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Source + build
COPY src ./src
RUN mvn clean package -DskipTests -B

# Qatlamli (layered) jar: dependency'lar alohida qatlamga chiqadi va har commit'da
# qayta push qilinmaydi — ilgari 60 MB lik yagona qatlam har deploy'da yangidan ketardi.
RUN java -Djarmode=tools -jar target/shina_magazin_api.jar extract --layers --launcher --destination extracted

# ========== RUN STAGE ==========
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Timezone + su-exec (root'dan `app` foydalanuvchisiga tushish uchun)
RUN apk add --no-cache tzdata su-exec \
    && addgroup -S app && adduser -S -G app app
ENV TZ=Asia/Tashkent

# Yuklangan mahsulot rasmlari papkasi — Coolify PERSISTENT VOLUME shu yerga mount qilinadi.
# Egalik docker-entrypoint.sh'da har startda `app` ga o'tkaziladi (eski root volume uchun ham).
RUN mkdir -p /data/uploads && chown -R app:app /data/uploads /app
ENV SHOP_STORAGE_DIR=/data/uploads

COPY --chown=app:app --from=build /app/extracted/dependencies/ ./
COPY --chown=app:app --from=build /app/extracted/spring-boot-loader/ ./
COPY --chown=app:app --from=build /app/extracted/snapshot-dependencies/ ./
COPY --chown=app:app --from=build /app/extracted/application/ ./

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8183/api/actuator/health || exit 1

EXPOSE 8183

ENTRYPOINT ["docker-entrypoint.sh"]
# Heap konteyner limitidan foizda: ilgari -Xmx512m qattiq edi — katta konteynerda
# xotira ishlatilmas, kichigida GC o'rniga OOM-kill bo'lardi.
CMD ["java", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:+ExitOnOutOfMemoryError", \
    "-Dspring.profiles.active=prod", \
    "org.springframework.boot.loader.launch.JarLauncher"]
