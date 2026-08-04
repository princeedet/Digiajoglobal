<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$input = '{"name":"User Five","phone":"08055555555","email":"user5@example.com","plan":"double-up","paymentMethod":"paystack"}';
// Mock file_get_contents('php://input') - we can't easily do this, so let's modify the register.php locally for a second to read from a file or variable, OR we can just use cURL to a script that prints errors!
