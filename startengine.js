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

// const util = require('util');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

/**
 * @param {String} workpath - путь к файлу config_akumuli.json (это конфиг агента) и ak.config
 */

module.exports = function(workpath) {
 
  const configPath = path.join(workpath, 'config_akumuli.json');
  const path_akconfig = path.join(workpath, 'ak.config'); // Всегда в рабочей папке!!

  const config = getAgentConfig(); // Получить содержимое config_akumuli.json
  checkOrMakeAkConfig();
  checkOrCreateDB();
  return spawn(config.path_akumulid, ['--config', path_akconfig]);
  /*
  return spawn(config.path_akumulid, ['--config', path_akconfig], {
    detached: true,  // В этом случае канал к дочернему процессу не существует!
    stdio: 'ignore'
  });
 */

  function getAgentConfig() {
    if (!fs.existsSync(configPath)) throw { message: 'ERROR: startengine: File not found: ' + configPath };
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      throw { message: 'ERROR: startengine: Invalid config: ' + configPath + '. ' + JSON.stringify(e) };
    }
  }

  function checkOrMakeAkConfig() {
    if (!config.path_akumulid) throw { message: 'ERROR: startengine: Expected path_akumulid in ' + configPath };
    if (!config.path_akdb) throw { message: 'ERROR: startengine: Expected path_akdb in ' + configPath };
    if (!fs.existsSync(config.path_akumulid))
      throw { message: 'ERROR: startengine: File not found: ' + config.path_akumulid };

    if (!fs.existsSync(path_akconfig)) makeAkConfig();
  }

  // создать файл ak.config из заготовки ak.config.pat
  // Файл ak.config.pat должен быть в составе пакета!
  // В заготовке заменить '${akdb}' на путь к БД: config.path_akdb
  // Файл записать в path_akconfig
  function makeAkConfig() {
    const pattern = path.join(__dirname, 'ak.config.pat');
    if (!fs.existsSync(pattern)) throw { message: 'ERROR: startengine: File not found: ' + pattern };

    const pat_str = String(fs.readFileSync(pattern, 'utf8'));
    const str = pat_str.replace(/\${akdb}/g, config.path_akdb);

    fs.writeFileSync(path_akconfig, str, 'utf8');
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
        throw {
          message: 'ERROR: startengine: Папка БД не содержит файл db.akumuli, но содержит файлы ' + files.join(',')
        };
    }

    // Node.js execFileSync: if process has a non-zero exit code, this method will throw.
    const stdout = execFileSync(config.path_akumulid, ['--create', '--config', path_akconfig]);

    console.log('akumuli --create: \n' + stdout);
  }
};
