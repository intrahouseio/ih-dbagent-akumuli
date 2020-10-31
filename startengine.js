/**
 * startengine.js
 * Модуль для старта движка БД
 * Входит в пакет dbagent-а
 *
 * Выполняется на старте системы
 *
 * Для Akumuli
 * ! Запуск akumuli выполняется с ключом --config  <путь к файлу ak.config>
 * ! Файл ak.config всегда берется из рабочей папки приложения (WorkingDir)
 * ! Это возможность запускать несколько экземпляров одновременно
 *
 *  - Проверить конфиг файл ak.config, при отсутствии - создать
 *  - Проверить папку с БД. Если БД еще нет:
 *        - создать папку
 *        - запуск akumuli c ключом --create
 *  - Запустить akumuli как child, вернуть childProcess handle
 *    При ошибке возбуждается исключение
 *
 * Все делается синхронно!!
 */

const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

module.exports = function(config) {
  checkOrMakeConfig();
  checkOrCreateDB();
  return spawn(config.path_akumulid, ['--config', config.path_akconfig]);

  function checkOrMakeConfig() {
    if (!config.path_akumulid) throw { message: 'Expected path_akumulid in "config.json"' };
    if (!config.path_akdb) throw { message: 'Expected path_akdb in "config.json"' };
    if (!fs.existsSync(config.path_akumulid)) throw { message: 'File not found: ' + config.path_akumulid };

    if (!fs.existsSync(config.path_akconfig)) makeAkConfig(config);
  }

  // создать файл ak.config из заготовки ak.config.pat
  // Файл ak.config.pat должен быть в составе пакета!
  // В заготовке заменить '${akdb}' на путь к БД: config.path_akdb
  // Файл записать в config.path_akconfig
  function makeAkConfig() {
    const pattern = path.join(__dirname, 'ak.config.pat');
    if (!fs.existsSync(pattern)) throw { message: 'SOFT ERROR: File not found: ' + pattern };

    const pat_str = String(fs.readFileSync(pattern, 'utf8'));
    const str = pat_str.replace(/\${akdb}/g, config.path_akdb);

    fs.writeFileSync(config.path_akconfig, str, 'utf8');
  }

  // Проверить, что папка БД существует и содержит файл db.akumuli
  // Если папки нет - создать
  // Если папка содержит другие файлы, но нет db.akumuli - ошибка
  function checkOrCreateDB() {
    if (fs.existsSync(path.join(config.path_akdb, 'db.akumuli'))) return;

    if (!fs.existsSync(config.path_akdb)) {
      fs.mkdirSync(config.path_akdb, { recursive: true });
    } else {
      const files = fs.readdirSync(config.path_akdb);
      if (files && files.length)
        throw { message: 'Папка БД не содержит файл db.akumuli, но содержит файлы ' + files.join(',') };
    }

    // Node.js execFileSync: if process has a non-zero exit code, this method will throw.
    const stdout = execFileSync(config.path_akumulid, ['--create', '--config', config.path_akconfig]);
   
    console.log('akumuli --create: \n' + stdout);
  }
};
