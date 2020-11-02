# ih-dbagent-ak

Реализация db-агента системы IH для БД Akumuli.

## dbagent
В системе IH db-агент запускается как дочерний процесс, точка входа [dbagent.js](dbagent.js). 

Все модули, необходимые для запуска db-агента, находятся в папке **lib**

## startengine
Модуль startengine.js выполняет запуск движка БД 
(это опционально, **Akumuli** может быть запущен помимо IH).

Если startengine.js есть, IH запустит его перед стартом агента.

## app
Для тестовых целей возможен запуск модуля как консольного приложения ```node app.js``` или сервиса.

 - запускается **Akumuli** как дочерний процесс (startengine.js)
 - запускается dbagent как дочерний процесс
 - В случае удачного запуска приложение периодически пишет и читает данные.
 - При ошибке akumuli или dbagent приложение завершается

Приложение app использует модули из папки core (dbconnector.js) для эмуляции работы со стороны IH 

## Конфигурирование Akumuli

Запуск **akumuli** выполняется с ключом --config <имя файла>  
Конфигурация задает папку с БД и порты для работы.
Это дает возможность запускать несколько экземпляров одновременно (для каждого сервиса IH)

Файл конфигурации ak.config должен находиться в рабочей папке приложения 

Если его нет - файл создается из ak.config.pat на этапе  startengine

Если папки БД нет, она также создается на этапе  startengine командой:

```akumuli --create --config path/file/ak.config```



