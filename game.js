//--------------
// DECLARACIONES
//--------------

// ------Constantes------
const GAME_WIDTH = window.innerWidth; // Tamaño del ancho de la ventana
const GAME_HEIGHT = window.innerHeight; // Tamaño del alto de la ventana
const PACHINKO_WIDTH = GAME_WIDTH * 0.3; // Ancho del área del pachinko
const ACTION_WIDTH = GAME_WIDTH * 0.7; // Ancho del área de juego
const ROUND_DURATION = 20; // Duración en segundos de cada ronda
const GAME_SPEED = 240; // Velocidad de juego, todas las velocidades de movimiento se multiplican por este valor


// ------Clases------

/*  Clase principal. Almacena toda la información relevante del juego.
    Permite reiniciar todo el estado del juego creando una nueva instancia. */
class Game {
    constructor() {
        this.is_running = false; // Pausa el juego al terminar ronda
        this.round = null;  // Almacena el objeto ronda
        this.round_number = 0; // Número de ronda
        this.enemies = []; // Array de enemigos en juego
        this.bullets = []; // Array de balas en juego
        this.hits = []; // Array de marcadores de daño en juego
        this.score = 0; // Puntuación de la partida
        this.last_time = 0; // Tiempo desde el último render()
    }

    // Loop principal del juego
    render(current_time = 0) {
        pachinko_CTX.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        action_CTX.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        damage_CTX.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Se usa el delta time para mantener la velocidad constante independientemente de los FPS
        const delta_time = (current_time - this.last_time) / 1000;
        this.last_time = current_time;
        
        this.pachinko.draw(delta_time);
        
        this.player.update(delta_time);

        this.enemies.forEach(enemy => {
            enemy.update(delta_time); 
        });

        this.bullets.forEach(bullet => {
            bullet.update(delta_time);
        });

        this.hits.forEach(hit => {
            hit.draw();
        });

        requestAnimationFrame((time) => this.render(time));
    }

    // Inicia el juego la primera vez
    start() {
        this.is_running = true;
        this.round = new Round();
        this.player = new Player();
        this.pachinko = new Pachinko();

        start_screen.classList.add('hidden');

        this.spawn_enemies();

        update_UI();

        requestAnimationFrame((time) => this.render(time));
    }

    // Inicia una nueva ronda
    new_round(){
        shop_screen.classList.add('hidden');
        this.round = new Round(this.round_number);
        this.pachinko.create_obstacles();
        this.player.reset_position();
        this.is_running = true;

        this.spawn_enemies();

        update_UI();

        requestAnimationFrame((time) => this.render(time));
    }

    // Termina el juego al morir
    game_over() {
        this.round.is_active = false;
        clearInterval(this.round.timer);
        this.is_running = false;
        
        final_score_display.textContent = `Puntuación Final: ${this.score}`;
        final_round_display.textContent = `Máxima ronda alcanzada: ${this.round_number}`;

        game_over_screen.classList.remove('hidden');
    }

    // Función que genera enemigos. 
    // Se llama a sí misca en un intervalo de tiempo que disminuye con cada ronda.
    spawn_enemies() {
        if (!this.is_running) {     // Intento de solucionar bugs añadidos al introducir delta_time, no debería hacer falta, ya que se llama antes.
            clearTimeout(this.spawner)
            return;
        }

        const enemy_count = Math.min(2 + Math.floor(this.round_number * 1.5), 12); // Número de enemigos por tanda
        const spawn_rate = Math.max(500, 3000 - this.round_number * 150); // Intervalo de tiempo entre generaciones

        // Los enemigos se generan entre 2 círculos, con radio de la pantalla y x1.3 ese radio.
        const minDistance = Math.min(ACTION_WIDTH, GAME_HEIGHT);
        const maxDistance = Math.min(ACTION_WIDTH, GAME_HEIGHT) * 1.3;

        for (let i = 0; i < enemy_count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);

            const x = (ACTION_WIDTH/2) + Math.cos(angle) * distance;
            const y = (GAME_HEIGHT/2) + Math.sin(angle) * distance;
            
            // Se genera un enemigo en la posición y se añade al array para que render() pueda actualizarlo
            const enemy = new Enemy(x, y);
            this.enemies.push(enemy);
        }

        // Se vuelve a llamar la función de spawn tras un tiempo. this.spawner permite parar el temporizador.
        this.spawner = setTimeout(() => this.spawn_enemies(), spawn_rate);
    }
}


// Clase del jugador. almacena todos los datos relevantes al jugador, y se encarga de su actualización.
class Player {
    constructor() {
        this.x = ACTION_WIDTH / 2; //Posición en pantalla
        this.y = GAME_HEIGHT / 2;
        this.radius = 20; // radio de la esfera del jugador
        this.speed = 3 * GAME_SPEED; // Velocidad de movimiento
        this.color = '#36f9f6'; // Color de la esfera
        this.health = 100; // Vida actual. Se muestra en un <progress>
        this.max_health = 100; // Vida máxima
        this.base_damage = 1; // Multiplicador general de daño.
    }

    // Coloca el jugador en el centro al finalizar ronda, y lo cura
    reset_position(){
        this.x = ACTION_WIDTH / 2;
        this.y = GAME_HEIGHT / 2;

        this.health = this.max_health;
    }

    // Dibuja al jugador en pantalla en su posición.
    draw() {
        action_CTX.fillStyle = this.color;
        action_CTX.beginPath();
        action_CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        action_CTX.fill();
        action_CTX.closePath();
    }

    // Maneja el movimiento del jugador
    move(delta_time) {
        if (!game.is_running) return; // Impide el movimiento al terminar la ronda

        let moveX = 0;
        let moveY = 0;
        
        // Acumular los inputs permite movimiento fluído y constante
        if (inputs.move_inputs['w'] || inputs.move_inputs['arrowup']) {
            moveY -= 1;
        }
        if (inputs.move_inputs['s'] || inputs.move_inputs['arrowdown']) {
            moveY += 1;
        }
        if (inputs.move_inputs['a'] || inputs.move_inputs['arrowleft']) {
            moveX -= 1;
        }
        if (inputs.move_inputs['d'] || inputs.move_inputs['arrowright']) {
            moveX += 1;
        }
        
        // Normalización del vector de movimiento, 
        // para que se mueva a la misma velocidad al ir en diagonal
        if (moveX !== 0 && moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
        }
        
        // Velocidad constante controlada por la variable speed
        const newX = this.x + moveX * this.speed * delta_time;
        const newY = this.y + moveY * this.speed * delta_time;
        
        // Evita que el jugador se salga del borde de juego
        this.x = Math.max(this.radius, Math.min(ACTION_WIDTH - this.radius, newX));
        this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, newY));
    }

    // Función que se llama desde el render()
    // Primero mueve al personaje y luego lo dibuja en la nueva posición.
    update(delta_time){
        this.move(delta_time);
        this.draw();
    }
}


// Clase de las Rondas. Principalmente contiene un temporizador que se inicia al instanciar la ronda.
class Round {
    constructor(round_number = 0) {
        game.round_number = round_number + 1; 
        this.is_active = true;
        this.remaining_time = ROUND_DURATION;
        // El timer se llama cada segundo, para actualizar directamente la UI con segundos
        this.timer = setInterval(() => this.update_timer(), 1000);
    }

    update_timer() {
        if (this.is_active) { // Permite pausar el timer, y evita que se llame por error si setInterval se lanza tras terminar.
            this.remaining_time--;
            update_UI();
            if (this.remaining_time <= 0) this.end_round(); // Al llegar a 0 termina la ronda
        }
    }

    end_round(){
        game.is_running = false; // Pausa el juego
        this.is_active = false; // Pausa el timer
        // Aunque las funciones estén paradas, los timers se siguen llamando a intervalos regulares,
        // por lo que se borran.
        clearInterval(this.timer);
        clearTimeout(game.spawner);
        

        // JS no tiene destructores, los objetos se borran cuando no existe ninguna referencia a ellos en memoria
        // Los enemigos y las balas en juego se almacenean en un array durante el juego.
        // Al vaciar los arrays se eliminan todos las instancias, reseteando la ronda.
        game.enemies = [];
        game.bullets = [];

        // Se generan opciones para la tienda y se muestra
        generate_shop_options();
        shop_screen.classList.remove('hidden');
    }

}


// Clase del Pachinko. Controla toda la zona izquierda de la pantalla
class Pachinko {
    constructor() {
        this.obstacles = []; // Array que contiene los obstáculos del pachinko
        this.recharging_balls = []; // Contiene las bolas en recarga, que aparecen en la barra lateral izq
        this.active_balls = []; // Contiene las bolas actualmente cayendo por el pachinko
        this.rows = 8; // Número de filas
        this.cols = 4; // Número de columnas
        this.peg_radius = 8; // Radio de los obstáculos
        // Nada mas instanciarse se generan los obstáculos y tres bolas aleatorias
        this.create_obstacles();
        this.starting_balls();
    }

    // Genera 3 bolas aleatorias al empezar el juego
    starting_balls() {
        for (let i = 0; i < 3; i++) {
            const random_ball_type = ball_types[Math.floor(Math.random() * ball_types.length)];
            var ball = new Ball(random_ball_type);
            this.recharging_balls.push(ball);
        }
    }

    // Crea los obstáculos del pachinko
    create_obstacles() {
        this.obstacles = [];
        const horizontal_spacing = PACHINKO_WIDTH * 0.8 / this.cols;
        const vertical_spacing = GAME_HEIGHT * 0.7 / this.rows;
    
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const Dx = row % 2 === 0 ? horizontal_spacing / 2 : 0; // Desfasa las filas pares e impares, para que no se alineen
                const x = PACHINKO_WIDTH * 0.1 + col * horizontal_spacing + Dx + 12;
                const y = GAME_HEIGHT * 0.15 + row * vertical_spacing;
                
                // TODO: radio dependiente de tamaño de pantalla
                // separar objeto 
                this.obstacles.push({
                    x: x,
                    y: y,
                    radius: this.peg_radius,
                    color: '#443964'
                });
            }
        }
    }

    // Dibuja los obstáculos, y actualiza el movimiento de cada bola activa
    draw(delta_time) {
        this.obstacles.forEach(peg => {
            pachinko_CTX.fillStyle = peg.color;
            pachinko_CTX.beginPath();
            pachinko_CTX.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
            pachinko_CTX.fill();
            pachinko_CTX.closePath();
        });

        this.active_balls.forEach(ball => {
            ball.update_falling(delta_time);
        });
    }
}


// Clase Bola del pachinko. Principalmente se encarga de su movimiento por el pachinko
class Ball {
    constructor(type = 'base') {
        // El ID es una prueba para evitar fallos con el .push(), 
        // al no saber concretamente su comportamiento con entidades idénticas.
        // Creo que no es necesario tras unos cambios en el restp del código.
        this.ID = Date.now() + Math.random().toString(36).substr(2, 9); 
        this.x = PACHINKO_WIDTH / 2; // La bola se genera en la parte superior, y en el centro del pachinko
        this.y = 50;
        this.velX = (Math.random() - 0.5) * (4 * GAME_SPEED); // Se lanza con una dirección aleatoria, para que cada bola tome un camino
        this.velY = 2 * GAME_SPEED;
        this.radius = 12; // Radio de la bola
        this.speed = 5 * GAME_SPEED; // Velocidad de movimiento base
        this.bounces = 0; // Rebotes, el daño se calcula en base al número de rebotes
        this.type = type; // Tipo de la bola, usado para añadir efectos
        this.effect = 1; // Multiplicador para los efectos
        this.upgrades = []; // Cada bola puede mejorarse hasta 3 veces
        this.gravity = 0.2 * GAME_SPEED * 40; // Imita la gravedad, escalada a la velocidad de juego

        // Cada tipo de bola tiene un color, un daño base, y un tiempo de recarga
        switch (type) {
            case 'base':
                this.color = '#ff7edb';
                this.damage = 17;
                this.cooldown = 1500;
                break;
            case 'fuego':
                this.color = '#ff8b39';
                this.damage = 10;
                this.cooldown = 2000;
                break;
            case 'hielo':
                this.color = '#218fff';
                this.damage = 5;
                this.cooldown = 1200;
                break;
            case 'veneno':
                this.color = '#64f1b0';
                this.damage = 2;
                this.cooldown = 800;
                break;
            case 'perforacion':
                this.color = '#fede5d';
                this.damage = 13;
                this.cooldown = 1700;
                break;
            case 'explosiva':
                this.color = '#fe4450';
                this.damage = 8;
                this.cooldown = 2300;
                break;
        }

        // Al instanciarse, se añade a si misma a la barra lateral
        this.make_slot();
        balls_container.appendChild(this.slot);
        
        // Ñapa terrible, pero soluciona muchos problemas llamar a intervalos a la funcion.
        setTimeout(() => { this.drop() }, this.cooldown);
    }

    // Crea un elemento para la barra lateral y lo añade
    make_slot() {
        const replace = balls_container.contains(this.slot); // Si el objeto ya se encuentra dentro, se reemplaza, no se añade uno nuevo
        if (this.slot && replace) balls_container.removeChild(this.slot); 

        // En la barra izquierda la bola es un div del color de la instancia
        const slot = document.createElement('div');
        slot.className = 'ball-slot';
        slot.style.backgroundColor = this.color;

        // La bola tiene un elemento hijo, que representa de 0-3 el numero de mejoras
        const upgrade_count = document.createElement('div');
        upgrade_count.className = 'upgrade-count';
        upgrade_count.textContent = this.upgrades.length;
        slot.appendChild(upgrade_count);

        this.slot = slot;
        if(replace) balls_container.appendChild(this.slot);
    }

    // Añade la bola a la barra lateral
    push_to_inv() {
        game.pachinko.recharging_balls.push(this);
        balls_container.appendChild(this.slot);
    }

    // Saca la bola de la barra lateral, y resetea su posición y rebotes
    remove_from_inv() {
        this.x = PACHINKO_WIDTH / 2;
        this.y = 50;
        this.velX = (Math.random() - 0.5) * (4 * GAME_SPEED);
        this.velY = 2 * GAME_SPEED;
        this.bounces = 0;

        game.pachinko.recharging_balls.splice(game.pachinko.recharging_balls.indexOf(this), 1);
        game.pachinko.active_balls.push(this);

        balls_container.removeChild(this.slot);
    }

    // Actualiza la posición mientras cae por el pachinko
    update_falling(delta_time) {
        // Aplica la "gravedad"
        this.velY += this.gravity * delta_time;
        
        // Nueva posición provisional
        let newX = this.x + this.velX * delta_time;
        let newY = this.y + this.velY * delta_time;

        // Colisión con las paredes laterales - Rebote
        if (newX - this.radius < 0) {
            newX = this.radius;
            this.velX = -this.velX * 0.8; // Pierde algo de energía con el rebote, para que acabe cayendo
            this.bounces++;
        } else if (newX + this.radius > PACHINKO_WIDTH) {
            newX = PACHINKO_WIDTH - this.radius;
            this.velX = -this.velX * 0.8;
            this.bounces++;
        }

        // Todo esto es un caos para arreglar el funcionamiento al añadir el deltaTime
        // No acabo de entender por qué, las físiscas se volvían locas en las rondas pares
        // Las bolas atravesaban las paredes laterales, o se quedaban "pegadas" a los obstáculos

        // Realizo tests de penetración, y "empujo" las bolas hacia afuera, antes de aplicar las físicas de rebote
        let collision_occurred = false;
        let penetration_depth = 0;
        let collision_normalX = 0;
        let collision_normalY = 0;
        
        for (const obstacle of game.pachinko.obstacles) {
            const dx = newX - obstacle.x;
            const dy = newY - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = this.radius + obstacle.radius;
            
            if (distance < minDistance) { // Si hay colisión con algún obstáculo
                penetration_depth = minDistance - distance; // Profundidad de la colisión
                collision_normalX = dx / distance;  // Dirección de impacto
                collision_normalY = dy / distance;
                collision_occurred = true;
                break; // Solo puede colisionar con un obstáculo cada frame
            }
        }

        
        if (collision_occurred) {
            // Empuja la bola fuera del objeto
            newX += collision_normalX * penetration_depth * 1.1;
            newY += collision_normalY * penetration_depth * 1.1;
            
            // Cambia la velocidad de la bola a la dirección de rebote, perdiendo algo de energía, para no rebotar infinitamente
            const dotProduct = this.velX * collision_normalX + this.velY * collision_normalY;
            this.velX = this.velX - (1.8 * dotProduct * collision_normalX);
            this.velY = this.velY - (1.8 * dotProduct * collision_normalY);
            
            // Aplica fricción a la velocidad, que se incrementa con el tamaño del obstáculo
            const friction = 0.85 - (0.05 * (game.pachinko.peg_radius / this.radius));
            this.velX *= friction;
            this.velY *= friction;
            
            this.bounces++;
        }

        // Setea la nueva posisión final
        this.x = newX;
        this.y = newY;

        // Detecta si la bola sale por abajo. La vuelve a meter a la barra lateral e inicia el cooldown.
        // Dispara una bala en el juego a la derecha
        if (this.y + this.radius > GAME_HEIGHT) {
            game.pachinko.active_balls.splice(game.pachinko.active_balls.indexOf(this), 1);
            this.push_to_inv();
            setTimeout(() => { this.drop() }, this.cooldown);
            new Bullet(this);
            return;
        }

        // Tras calcular la posición dibuja la bola en el canvas
        this.draw();
    }

    // Suelta la bola desde la zona superior del pachinko
    drop() {
        if (!game.pachinko || !game.pachinko.recharging_balls.includes(this)) return;
        
        if (game.is_running) {
            this.remove_from_inv();
        } else {
            setTimeout(() => { this.drop() }, this.cooldown);
        }
    }

    // Dibuja la bola en el canvas
    draw() {
        pachinko_CTX.fillStyle = this.color;
        pachinko_CTX.beginPath();
        pachinko_CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        pachinko_CTX.fill();
        pachinko_CTX.closePath();
    }
}


// Clase Bala. Se instancia al caer una bola del pachinko
// Se encarga de la colisión con enemigos y aplicar daños
class Bullet {
    constructor(ball) {
        this.x = game.player.x; // Se crea en la posición del jugador
        this.y = game.player.y;
        // El tamaño, color, tipo, daño base, y multiplicador de efecto son el mismo que los de la bola que la genera
        this.radius = ball.radius; 
        this.color = ball.color;
        this.type = ball.type;
        this.effect = ball.effect;
        // El daño depende del daño base de la bola, y los rebotes que realizó antes de caer. El total se multiplica por la variable del jugador
        this.damage = Math.round((ball.damage + (ball.bounces * 2)) * game.player.base_damage)
        this.speed = 10 * GAME_SPEED; // Velocidad de movimiento
        this.hit_count = 0; // Las balas de penetración pueden golpear a varios enemigos antes de desaparecer
        this.hit = false;

        this.fire(); // Al instanciarse se auto disparan
    }

    // Calcula la dirección al enemigo más cercano y se lanza hacia el
    fire(){
        let target = this.find_nearest_target();
        if (game.is_running && target) { // Si no hay ningún enemigo la bala no se dispara, y la bala se destruye
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
    
            this.velX = dx/dist * this.speed;
            this.velY = dy/dist * this.speed;

            game.bullets.push(this);
        }
    }

    // Mueve la bala, detecta colisión, y la dibuja. Se llama desde la función render()
    update(delta_time) {
        if (!this.hit){
            this.x += this.velX * delta_time;
            this.y += this.velY * delta_time;

            this.check_collision();
        }
        
        this.draw();
    }

    // Detecta colisones con enemigos
    check_collision() {
        // Si la bala sale de la zona de juego se destruye
        if (this.x < 0 || this.x > ACTION_WIDTH || this.y < 0 || this.y > GAME_HEIGHT) {
            this.destroy();
            return;
        }

        // Detecta la colisión con los enemigos
        for (const enemy of game.enemies) {
            const dx = this.x - enemy.x;
            const dy = this.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Al ser esferas basta con ver si la distancia  
            if (distance < this.radius + enemy.radius) {
                // Si la bola es de tipo explosivo, aplica el daño a todos los enemigos en un area tras el impacto
                if (this.type === 'explosiva') {
                    // Almacena los enemigos del frame actual, ya que el array externo se reordena al matar enemigos, y al generar más
                    const current_enemies = [...game.enemies] 
                    const current_x = this.x;
                    const current_y = this.y;

                    for(const in_enemy of current_enemies) {
                        const in_dx = current_x - in_enemy.x;
                        const in_dy = current_y - in_enemy.y;
                        const in_dist = Math.sqrt(in_dx * in_dx + in_dy * in_dy);
                        if (in_dist < (this.radius + 15) * 5 * this.effect){
                            in_enemy.apply_damage(this.damage);
                        }
                    }
                } else {
                    // Si no es explosiva, aplica el daño solo al enemigo impactado, y le aplica el efecto correspondiente
                    enemy.apply_damage(this.damage);
                    enemy.apply_effect(this.type, this.effect);
                }

                // Si la bala es de tipo perforacion, no se elimina hasta alcanzar el número de hits esperado
                // TODO: las balas pueden golpear varias veces al mismo enemigo
                if (this.type === 'perforacion' && this.hit_count !== Math.round(2 * this.effect)){
                    this.hit_count += 1;
                } else {
                    this.hit = true;
                    setTimeout(() => { this.destroy(); }, 50); // La bala no se elimina instantaneamente para poder mostrar el area de efecto de la explosión
                }

                break; // Una vez impactado, deja de comprobar si impacta con otros enemigos.
            }
        }
    }

    // Como no existen destructores, elimina la única referencia a la instancia, y el garbage collector ya se encarga de eliminar la instancia
    destroy() {
        game.bullets.splice(game.bullets.indexOf(this), 1);
    }

    // Devuelve el enemigo más cercano
    find_nearest_target() {
        if (game.enemies.length === 0) return null; // Si no hay enemigos devuelve null

        let nearest = null;
        let minDist = Infinity;
    
        game.enemies.forEach(enemy => {
            const dx = game.player.x - enemy.x;
            const dy = game.player.y - enemy.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            // calcula la distancia de cada enemigo, y almacena el más cercano
            
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        });

        return nearest;
    }

    // Dibuja la bala si no ha impactado
    draw() {
        if (this.hit && this.type === 'explosiva') { // si es explosiva, dibuja el radio de explosión tras el impacto
            const radius = (this.radius + 15 ) * 5;
            
            action_CTX.fillStyle ='rgba(249, 102, 104, 0.3)';
            action_CTX.beginPath();
            action_CTX.arc(this.x, this.y, radius, 0, Math.PI * 2);
            action_CTX.fill();
        } else if (!this.hit) {
            action_CTX.fillStyle = this.color;
            action_CTX.beginPath();
            action_CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            action_CTX.fill();
        }
    }  
}


// Clase Marcador de daño. Muestra el daño que ha causado una bala al impactar con el enemigo.
class HitMarker {
    constructor(enemy, damage) {
        this.x = enemy.x;   // Se genera en la posición del enemigo impactado
        this.y = enemy.y;
        this.damage = damage;
        setTimeout(() => { // Se autodestruye tras medio segundo
            this.destroy();
        }, 500);
    }

    // Muestra en forma de texto el daño causado al enemigo. Se llama en el render()
    draw() {
        damage_CTX.fillStyle = '#fe4450';
        damage_CTX.font = '20px Arial';
        damage_CTX.fillText(Math.round(this.damage).toString(), this.x, this.y + 4);
    }

    // Al igual que en el resto, se elimina del array, y el garbage collector se encarga de eliminar la instancia
    destroy() {
        game.hits.splice(game.hits.indexOf(this), 1);
    }
}


// Clase Enemigo. Se encarga de mover a los enemigos, y detectar la colisión con el jugador.
class Enemy {
    constructor(_x, _y){
        this.x = _x;
        this.y = _y;
        this.ID = Date.now() + Math.random().toString(36).substr(2, 9); // Igual que con las bolas, no se si afecta
        this.radius = 15 + game.round_number * 0.2; // Los enemigos escalan su radio con el número de ronda
        this.speed = (1 * GAME_SPEED) + game.round_number * (0.05 * GAME_SPEED); // Escalan la velocidad con cada ronda
        this.max_health = 20 + game.round_number * 3; // Escalan su vida máxima con cada ronda
        this.health = this.max_health;
        this.color = `hsl(${Math.random() * 60}, 70%, 50%)` // El color varía ligeramente entre amarillo y rojo
        this.burn_counter = 0;
    }

    // Se llama desde render(). Actualiza la posición del enemigo, comprueba las colisiones y los dibuja
    update(delta_time) {
        if(!game.is_running || !game.enemies.includes(this)) return;

        // Mueve al enemigo en dirección hacia el jugador
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.x += dx / distance * this.speed * delta_time;
        this.y += dy / distance * this.speed * delta_time;

        this.draw();
        this.check_collision();
    }

    // Detecta la colisión con el jugador
    check_collision() {
        if (!game.enemies.includes(this)) return;

        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Al igual que las balas, como son esferas basta con ver si la distancia es menor que la suma de los radios
        if (distance < game.player.radius + this.radius) {
            
            game.player.health -= 10;
            update_UI();
            
            // Al golpear empuja al personaje un poco hacia atrás
            const knockback = 5;
            game.player.x += dx / distance * knockback;
            game.player.y += dy / distance * knockback;
            
            this.destroy();

            // Asegura que si te golpean cerca del borde no te salgas
            game.player.x = Math.max(game.player.radius, Math.min(ACTION_WIDTH - game.player.radius, game.player.x));
            game.player.y = Math.max(game.player.radius, Math.min(GAME_HEIGHT - game.player.radius, game.player.y));
            
            // Flashea la pantalla en rojo cuado te golpean
           action_side.style.backgroundColor ='rgb(54, 18, 39)';
            setTimeout(() => {
                action_side.style.backgroundColor = 'var(--background-01)';
            }, 100);

            // Si el jugador se queda sin vida se acaba el juego
            if (game.player.health <= 0) {
                game.game_over();
            }
        }
    }

    // Resta vida al enemigo, y muestra un marcador del daño recibido.
    // Si se queda sin vida, se elimina, y añade puntuación al total, que depende del total de 
    apply_damage(damage){
        this.health -= damage;

        game.hits.push(new HitMarker(this, damage));

        if (this.health <= 0) {
            game.score += 100 * game.round_number;
            this.destroy();
        }
    }

    // Aplica efectos especiales según el tipo de bala
    apply_effect(type, multi) {
        if (this.health <= 0) return;

        switch(type){
            case 'fuego':
                // La bala de fuego aplica daño por segundo 3 veces
                this.color = 'rgb(54, 24, 18)';
                if (this.burn) clearInterval(this.burn);
                this.burn_counter = 0;
                this.burn = setInterval(() => {
                    if (this.health <= 0 || !game.enemies.includes(this)) {
                        clearInterval(this.burn);
                        return;
                    }
                    this.apply_damage(10);
                    this.burn_counter++;
                    if (this.burn_counter > 2) clearInterval(this.burn);
                }, 1000 / multi);
                break;
            case 'hielo':
                // La bala de hielo ralentiza la velocidad de movimiento del enemigo
                this.color = 'rgb(93, 99, 185)';
                if(this.burn) clearInterval(this.burn);
                this.speed -= Math.min(0.7*multi *GAME_SPEED , this.speed); // Si es golpeado varias veces, sigue reduciendo la velocidad hasta detenerse
                break;
            case 'veneno':
                // La bala de veneno hace daño muy pequeño cada 0,1 segundos de forma indefinida hasta que muere
                this.color = 'rgb(86, 126, 21)';
                if (this.venom) clearInterval(this.venom);
                this.venom = setInterval(() => {
                    if (this.health <= 0 || !game.enemies.includes(this)) {
                        clearInterval(this.venom);
                        return;
                    }
                    this.apply_damage(1*multi);
                }, 100);
                break;
        }
    }

    // Dibuja al enemigo, y su barra de vida
    draw() {
        if (!game.enemies.includes(this)) return;

        action_CTX.fillStyle = this.color;
        action_CTX.beginPath();
        action_CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        action_CTX.fill();
        action_CTX.closePath();

        // La barra de vida es un cuadrado rojo y uno verde, que se ajusta al porcentaje de vida restante
        const health_percent = this.health / this.max_health;
        action_CTX.fillStyle = '#fe4450';
        action_CTX.fillRect(this.x - this.radius, this.y - this.radius - 8, this.radius * 2, 4);
        action_CTX.fillStyle = '#64f1b0';
        action_CTX.fillRect(this.x - this.radius, this.y - this.radius - 8, this.radius * 2 * health_percent, 4);
    }

    // Elimina los timers del fuego y veneno, y quita 
    destroy() {
        if (this.burn) clearInterval(this.burn);
        if (this.venom) clearInterval(this.venom);
        game.enemies.splice(game.enemies.indexOf(this), 1);    
    }
}

// ------Variables------

// Canvases
const action_canvas = document.getElementById('action-canvas');
const damage_canvas = document.getElementById('damage-canvas');
const pachinko_canvas = document.getElementById('pachinko-canvas');
const action_CTX = action_canvas.getContext('2d');
const damage_CTX = damage_canvas.getContext('2d');
const pachinko_CTX = pachinko_canvas.getContext('2d');
action_canvas.width = ACTION_WIDTH;
action_canvas.height = GAME_HEIGHT;
damage_canvas.width = ACTION_WIDTH;
damage_canvas.height = GAME_HEIGHT;
pachinko_canvas.width = PACHINKO_WIDTH;
pachinko_canvas.height = GAME_HEIGHT;

// Elementos HTML
const start_screen = document.getElementById('start-screen');
const start_button = document.getElementById('start-button');
const timer_display = document.getElementById('round-timer');
const round_display = document.getElementById('round-number');
const health_bar = document.getElementById('health-bar');
const balls_container = document.getElementById('inventory-slots');
const shop_screen = document.getElementById('shop-screen');
const next_round_button = document.getElementById('next-round-button');
const action_side = document.getElementById('action-side');
const final_score_display = document.getElementById('final-score');
const final_round_display = document.getElementById('final-round');
const game_over_screen = document.getElementById('game-over-screen');
const restart_button = document.getElementById('restart-button');
const score_display = document.getElementById('score-display');


var game = new Game();
let shop_options = [];
const ball_types = ['base','fuego', 'hielo', 'veneno', 'perforacion', 'explosiva'];

// La idea era hacer un menú de pausa, y poder cambiar los controles.
// El código para cambiar los controles funciona, pero no dio tiempo a hacer el menú,
// y set_move_inputs no se llama en ningún momento.
const inputs = {
    move_inputs: {
        'w': false,
        'a': false,
        's': false,
        'd': false
    },

    set_move_inputs(option) {
        switch (option) {
            case 'wasd':
                this.move_inputs = {
                    'w': false,
                    'a': false,
                    's': false,
                    'd': false
                };
                break;
            case 'arrows':
                this.move_inputs = {
                    'arrowup': false,
                    'arrowleft': false,
                    'arrowdown': false,
                    'arrowright': false
                };
                break;
        }
    }
};

// ------Event Listeners------

// Detecta las teclas al pulsar y dejar de pulsar.
// De momento solo se usa para el movimiento del personaje
document.addEventListener('keydown', (event) => {
    let lower_key = event.key.toLowerCase();
    if (inputs.move_inputs.hasOwnProperty(lower_key)) {
        inputs.move_inputs[lower_key] = true;
    }
});
document.addEventListener('keyup', (event) => {
    let lower_key = event.key.toLowerCase();
    if (inputs.move_inputs.hasOwnProperty(lower_key)) {
        inputs.move_inputs[lower_key] = false;
    }
});

// Detecta los clicks a los diversos botones
start_button.addEventListener('click', () => {game.start()});
next_round_button.addEventListener('click', () => {game.new_round()});
restart_button.addEventListener('click', restart_game);

document.querySelectorAll('.shop-button').forEach((button, index) => {
    button.addEventListener('click', () => select_shop_option(index));
});


//--------------
// FUNCIONES
//--------------

// Reinicia todo el juego, haciendo una nueva instancia de Game
function restart_game() {
    game = new Game();
    
    game_over_screen.classList.add('hidden');
    start_screen.classList.remove('hidden');
    
    balls_container.replaceChildren(); // Elimina todas las bolas de la barra izquierda
}


// Genera las 3 opciones de la tienda al terminar la ronda
// TODO: hacer que no se repitan las opciones. Ahora mismo puede aparecer 3 veces la misma opción de forma aleatoria.
function generate_shop_options() {
    shop_options = [];
    const option_types = ['new_ball', 'upgrade', 'item', 'pachinko'];
    
    for (let i = 0; i < 3; i++) {
        const option_type = option_types[Math.floor(Math.random() * option_types.length)]; // Elige una opción de forma aleatoria
        
        switch (option_type) {
            case 'new_ball':
                // Añade una bola de un tipo aleatorio
                const random_ball_type = ball_types[Math.floor(Math.random() * ball_types.length)];
                
                shop_options.push({
                    type: 'new_ball',
                    ball_type: random_ball_type,
                    title: `Bola de ${random_ball_type.charAt(0).toUpperCase() + random_ball_type.slice(1)}`,
                    description: `Añade una nueva bola de ${random_ball_type} a tu inventario.`
                });
                break;
                
            case 'upgrade':
                // Mejora una bola del inventario
                let balls_container = [...game.pachinko.recharging_balls, ...game.pachinko.active_balls]; // Junta todos las bolas activas y no activas, para elegir una al azar del total
                if (balls_container.length > 0) {
                    const random_ball_index = Math.floor(Math.random() * balls_container.length);
                    const ball = balls_container[random_ball_index];
                    if (ball.upgrades.length < 3) {
                        const upgrade_types = ['damage', 'size', 'effect'];
                        const random_upgrade_type = upgrade_types[Math.floor(Math.random() * upgrade_types.length)];
                        
                        let o_title, o_description;
                        
                        switch (random_upgrade_type) {
                            case 'damage':
                                o_title = `Mejora de Daño: ${ball.type}`;
                                o_description = `Incrementa el daño de una de tus bolas de ${ball.type} un 50%.`;
                                break;
                            case 'size':
                                o_title = `Mejora de Tamaño: ${ball.type}`;
                                o_description = `Incrementa el tamaño de una de tus bolas de ${ball.type}.`;
                                break;
                            case 'effect':
                                o_title = `Mejora de Efecto: ${ball.type}`;
                                o_description = `Mejora el efecto especial de una de tus bolas de ${ball.type}.`;
                                break;
                        }
                        
                        shop_options.push({
                            type: 'upgrade',
                            ball_index: random_ball_index,
                            upgrade_type: random_upgrade_type,
                            title: o_title,
                            description: o_description
                        });
                    } else {
                        // Si la bola ya tiene 3 mejoras, no se puede mejorar más , se escoge otra opción
                        i--;
                    }
                } else {
                    // Si no quedan bolas que mejorar, se elige otra opción
                    i--;
                }
                break;
                
            case 'item':
                // Mejora estadísticas base del personaje
                const items = ['health', 'speed', 'damage'];
                const random_item = items[Math.floor(Math.random() * items.length)];
                
                let title, description;
                
                switch (random_item) {
                    case 'health':
                        title = 'Más Vida';
                        description = 'Incrementa tu vida máxima un 20%.';
                        break;
                    case 'speed':
                        title = 'Más Velocidad';
                        description = 'Incrementa tu velocidad de movimiento un 15%.';
                        break;
                    case 'damage':
                        title = 'Más Daño General';
                        description = 'Incrementa el daño de todas las bolas un 20%.';
                        break;
                }
                
                shop_options.push({
                    type: 'item',
                    item_type: random_item,
                    title: title,
                    description: description
                });
                break;
            
            case 'pachinko':
                // Mejora las características del pachinko, para causar mayor número de rebotes
                const pachinko_upgrades = ['cols', 'rows', 'peg_radius'];
                const random_pachinko_upgrade = pachinko_upgrades[Math.floor(Math.random() * pachinko_upgrades.length)];

                let p_title, p_description;
                switch (random_pachinko_upgrade) {
                    case 'cols':
                        p_title = 'Más Columnas';
                        p_description = 'Incrementa en 2 el número de columnas en el Pachinko.';
                        break;
                    case 'rows':
                        p_title = 'Más Filas';
                        p_description = 'Incrementa en 2 el número de filas en el Pachinko.';
                        break;
                    case 'peg_radius':
                        p_title = 'Más Tamaño de Obstáculos';
                        p_description = 'Incrementa el tamaño de los obstáculos en el Pachinko.';
                        break;
                }

                shop_options.push({
                    type: 'pachinko',
                    pachinko_upgrade: random_pachinko_upgrade,
                    title: p_title,
                    description: p_description
                });
                break;
        }
    }
    
    // Actualiza los elementos <div> con los datos de las opciones escogidas
    const option_elements = document.querySelectorAll('.shop-option');
    option_elements.forEach((element, index) => {
        const option = shop_options[index];
        element.querySelector('.option-title').textContent = option.title;
        element.querySelector('.option-description').textContent = option.description;
        element.classList.remove('selected');
    });
    
    // Reactiva los botones, ya que se desactivaron al seleccionar una opción en la ronda anterior
    document.querySelectorAll('.shop-button').forEach(btn => {
        btn.disabled = false;
    });
}


// Función que se llama al pulsar uno de los botones de selección en la tienda
// Utiliza el data-index del <div> para identificar cual de las 3 opciones se escogió
function select_shop_option(index) {
    const option = shop_options[index];
    const balls_container = [...game.pachinko.recharging_balls, ...game.pachinko.active_balls];
    
    switch (option.type) {
        case 'new_ball':
            // Crea un nueva bola y la añade al inventario
            var newball = new Ball(option.ball_type);
            game.pachinko.recharging_balls.push(newball);
            break;
            
        case 'upgrade':
            //Mejora la bola seleccionada
            const ball = balls_container[option.ball_index];
            ball.upgrades.push(option.upgrade_type);
            ball.make_slot(); // Actualiza visualmente la bola en la barra lateral
            
            switch (option.upgrade_type) {
                case 'damage':
                    ball.damage *= 1.5;
                    break;
                case 'size':
                    ball.radius += 3;
                    ball.damage *= 1.2; // Incrementa el dño un poco al incrementar el tamaño
                    break;
                case 'effect':
                    ball.effect *= 1.3; // Incrementa el multiplicador del efecto
                    ball.damage *= 1.3; // También incrementa un poco el daño
                    break;
            }
            break;
            
        case 'item':
            switch (option.item_type) {
                case 'health':
                    // Incrementa la vida máxima del jugador y le cura
                    game.player.max_health = Math.floor(game.player.max_health * 1.2);
                    game.player.health = game.player.max_health;
                    break;
                case 'speed':
                    game.player.speed *= 1.15; // Incrementa la velocidad base del jugador
                    break;
                case 'damage':
                    game.player.base_damage *= 1.2; // Incrementa el daño total causado, no el base
                    break;
            }
            
            update_UI(); // Actualiza la interfaz, para reflejar el cambio de vida
            break;

        case 'pachinko':
            switch (option.pachinko_upgrade) {
                case 'cols':
                    game.pachinko.cols += 2; // Incrementa en 2 el número de columnas
                    break;
                case 'rows':
                    game.pachinko.rows += 2; // Incrementa en 2 el número de filas
                    break;
                case 'peg_radius':
                    game.pachinko.peg_radius += 4; // Incrementa el tamaño de los obstáculos
                    break;
            }
            break;
    }
    
    // Tras la selección se desactivan todos los botones, no permitiendo seleccionar más de una opción
    document.querySelectorAll('.shop-button').forEach(btn => {
        btn.disabled = true;
    });

    // Cambia el estilo del botón seleccionado
    document.querySelectorAll('.shop-option').forEach((opt, i) => {
        if (i === index) {
            opt.classList.add('selected');
        }
    });
}


// Actualiza la interfaz, para mostrar el temporizador, la ronda, la puntuación y la vida del jugador
// No se llama constantemente desde el render(), solo cuando recibe algún cambio.
function update_UI() {
    timer_display.textContent = `Tiempo restante: ${game.round.remaining_time.toString()}`;
    round_display.textContent = `Ronda: ${game.round_number.toString()}`;
    score_display.textContent = `Puntuación ${game.score.toString()}`;
    health_bar.max = game.player.max_health;
    health_bar.value = game.player.health;
}

