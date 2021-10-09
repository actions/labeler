Etiqueta de solicitud de extracción
estado de construcción y prueba dependencias

Etiquete automáticamente las nuevas solicitudes de extracción en función de las rutas de los archivos que se cambian.

Uso
Crear .github/labeler.yml
Cree un .github/labeler.ymlarchivo con una lista de etiquetas y minimatch globs para hacer coincidir para aplicar la etiqueta.

La clave es el nombre de la etiqueta en su repositorio que desea agregar (por ejemplo: "conflicto de combinación", "necesidades de actualización") y el valor es la ruta (pegote) de los archivos modificados (por ejemplo: src/**/*, tests/*.spec.js) o una coincidir con el objeto.

Coincidir con objeto
Para tener más control sobre las coincidencias, puede proporcionar un objeto de coincidencia en lugar de una simple ruta global. El objeto de coincidencia se define como:

- cualquiera : ['lista', 'de', 'globs'] 
  todos : ['lista', 'de', 'globs']
Se pueden proporcionar uno o ambos campos para una coincidencia detallada. A diferencia de la lista de nivel superior, la lista de globs de ruta proporcionada anyy allTODOS debe coincidir con una ruta para que se aplique la etiqueta.

Los campos se definen de la siguiente manera:

any: emparejar TODOS los globos con CUALQUIER ruta cambiada
all: emparejar TODOS los globs contra TODOS los caminos cambiados
Un glob de ruta simple es equivalente a any: ['glob']. Más específicamente, las siguientes dos configuraciones son equivalentes:

label1 :
- ejemplo1 / *
y

label1 :
- cualquiera : ['ejemplo1 / *']
Desde una perspectiva de lógica booleana, los objetos de coincidencia de nivel superior se OR-ed juntos y las reglas de coincidencia individuales dentro de un objeto se AND-ed. Combinado con la !negación, puede escribir reglas de coincidencia complejas.

Ejemplos básicos
# Agregue 'label1' a cualquier cambio dentro de la carpeta 'example' o cualquier subcarpeta 
label1 :
- ejemplo / ** / *

# Agregue 'label2' a cualquier cambio de archivo dentro de la carpeta 'example2' 
label2 : example2 / *
Ejemplos comunes
# Agregue la etiqueta 'repo' a cualquier 
repositorio de cambios de archivo raíz :
- ' * '

# Agregue la etiqueta '@ dominio / núcleo' a cualquier cambio dentro del paquete 'núcleo' 
@ dominio / núcleo: 
- paquete / núcleo / * 
- paquete / núcleo / ** / *

# Agregue la etiqueta 'prueba' a cualquier cambio en los archivos * .spec.js dentro de la 
prueba del directorio de origen :
- src / ** / *. spec.js

# Agregar 'fuente' etiqueta a cualquier cambio en los archivos src dentro del directorio de fuentes a excepción de la documentación subcarpeta 
fuente :
- cualquiera : ['src / ** / *', '! src / docs / *']

# Agregue la etiqueta 'frontend` a cualquier cambio en los archivos * .js siempre que el `main.js` no haya cambiado la 
interfaz :
- cualquiera : ['src / ** / *. js'] 
  todos : ['! src / main.js']
Crear flujo de trabajo
Cree un flujo de trabajo (p. Ej., .github/workflows/labeler.ymlConsulte Creación de un archivo de flujo de trabajo ) para utilizar la acción del etiquetador con el contenido:

name: "Pull Request Labeler"
on:
- pull_request_target

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/labeler@v3
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
Nota: Esto otorga acceso a la GITHUB_TOKENacción para que pueda realizar llamadas a la API de descanso de GitHub.

Entradas
Se definen varias entradas action.ymlpara permitirle configurar la etiquetadora:

Nombre	Descripción	Defecto
repo-token	Token que se utilizará para autorizar cambios en las etiquetas. Normalmente, el secreto de GITHUB_TOKEN	N / A
configuration-path	La ruta al archivo de configuración de la etiqueta	.github/labeler.yml
sync-labels	Si eliminar o no las etiquetas cuando los archivos coincidentes se revierten o el RP ya no los cambia	false
Contribuciones
¡Las contribuciones son bienvenidas! Consulte la Guía del colaborador .
