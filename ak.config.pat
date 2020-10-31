# akumulid configuration file 

# path to database files.  Default values is  ~/.akumuli.
path=${akdb}

# Number of volumes used  to store data.  Each volume  is
# 4Gb in size by default and allocated beforehand. To change number
# of  volumes  they  should  change  `nvolumes`  value in
# configuration and restart daemon.
nvolumes=4

# Size of the individual volume. You can use MB or GB suffix.
# Default value is 4GB (if value is not set).
volume_size=1GB


# HTTP API endpoint configuration

[HTTP]
# port number
port=8181


# TCP ingestion server config (delete to disable)

[TCP]
# port number
port=8282
# worker pool size (0 means that the size of the pool will be chosen automatically)
pool_size=0


# UDP ingestion server config (delete to disable)

[UDP]
# port number
port=8383
# worker pool size
pool_size=1


# Logging configuration
# This is just a log4cxx configuration without any modifications

# log4j.rootLogger=all, file
# log4j.appender.file=org.apache.log4j.DailyRollingFileAppender
# log4j.appender.file.layout=org.apache.log4j.PatternLayout
# log4j.appender.file.layout.ConversionPattern=%d{yyyy-MM-dd HH:mm:ss,SSS} [%t] %c [%p] %m%n
# log4j.appender.file.filename=/tmp/akumuli.log
# log4j.appender.file.datePattern='.'yyyy-MM-dd


# Write-Ahead-Log section (delete to disable)

[WAL]
# WAL location
path=${akdb}

# Max volume size. Log records are added until file size
# will exced configured value.
volume_size=256MB

# Number of log volumes to keep on disk per CPU core. E.g. with `volume_size` = 256MB
# and `nvolumes` = 4 and 4 CPUs WAL will use 4GB at most (4*4*256MB).
nvolumes=4


