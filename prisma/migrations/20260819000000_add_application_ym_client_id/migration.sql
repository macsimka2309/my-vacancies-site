-- ClientID Яндекс.Метрики: ключ для выгрузки офлайн-конверсий обратно в Директ.
ALTER TABLE "applications" ADD COLUMN "ym_client_id" TEXT;
