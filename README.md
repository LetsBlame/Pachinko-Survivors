Minijuego desarrollado en JavaScript para la asignatura de Diseño de Interfaces.
Universida de Salamanca - 2025

# Pachinko-Survivors

Sobrevive el máximo número de rondas posible. La puntuación final depende de los enemigos derrotados. \
La puntuación que otorga cada enemigo se incrementa con el número de ronda
---
### Controles
Usa WASD para moverte y esquivar a los enemigos. Eres el punto azul en pantalla. \
Pulsa CLICK IZQUIERDO sobre los botones para usarlos, cuando aparezcan.

### Jugabilidad
Las bolas de tu inventario caen a intervalos regulares por el Pachinko de la izquierda.\
Al caer de la pantalla, se disparan en forma de bala en el juego de la derecha. El daño que hacen depende del número de rebotes que realizó la bola antes de caer.\
Las balas se disparan al enemigo más cercano al jugador, y entran en cooldown en el Pachinko.\
\
Tras completar una ronda, se abre una tienda que permite escoger entre 3 opciones aleatorias. Pulsa uno de los botones para seleccionar la mejora.

### Dificultad
Los enemigos escalan su velocidad de movimiento, tamaño, y vida máxima en cada ronda, incrementando significativamente la dificultad.

----

### Tipos de balas
* Base: Daño alto, sin efectos especiales. 
* Fuego: Daño por impacto menor. Hace daño elevado por segundo 2 veces. La mejora de efecto aumenta el número de veces que hace daño.
* Hielo: Daño por impacto bajo. Ralentiza la velocidad de movimiento del enemigo. La mejora de efecto aumenta la reducción de velocidad.
* Veneno: Daño por impacto muy bajo. Hace 1 de daño constantemente cada tick. La mejora de efecto aumenta el daño causado por tick.
* Penetración: Daño por impacto moderado. Atraviesa enemigos y permite golpear a varios. La mejora de efecto aumenta número de impactos que puede realizar antes de desaparecer.
* Explosiva: Daño por impacto menor. Golpea a todos los enemigos en un radio desde el punto de impacto. La mejora de efecto aumenta el radio de explosión.
