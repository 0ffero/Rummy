<?php
header('Content-Type: application/json');

function getTexturesFromDirectory($directory) {
    $textures = [];
    
    if (is_dir($directory)) {
        $files = scandir($directory);
        foreach ($files as $file) {
            if (pathinfo($file, PATHINFO_EXTENSION) === 'jpg') {
                $textures[] = $directory . $file;
            }
        }
    }
    
    return $textures;
}

$groundTextures = getTexturesFromDirectory('./textures/ground/');
$tableTextures = getTexturesFromDirectory('./textures/table/');

$response = [
    'ground' => $groundTextures,
    'table' => $tableTextures
];

echo json_encode($response);
?>
