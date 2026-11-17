Get-Content database\seed.sql | docker exec -i -e 'MYSQL_PWD=your_password' medibook-mysql mysql -uroot
docker exec -it medibook-mysql mysql -uroot -p -e "SELECT COUNT(*) FROM medibook.appointments;"