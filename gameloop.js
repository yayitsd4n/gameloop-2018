// The game loop decouples the progresssion of game time from user input and processor speed
// Each turn of the loop it:
/*
  * Processes user input without blocking
  * Updates the game state
  * Renders the frame
  * Tracks the passage of time to control the rate of gameplay
*/

var noop = function(){};

/*
  Used to process user input. 
  Runs once at the beginning of a frame.
*/
var Begin = noop;

/*
  Used to update the game state.
  Is tied to a fixed timestep and may run
  more than once a frame to catch up with
  player time.
*/
var Update = noop;

/*
  Draws to the screen. Is decoupled from
  the update timestep and runs once per
  frame.
*/
var Render = noop;

/*
  Runs once per frame at the end. Can
  be used to for clean up or adjusting
  rendering based on the frame rate.
*/
var End = noop;

var Keys;

var Gameloop = {
  // Whether the loop is running or not
  started: false,
  // If the update loop takes longer than second, panic will be set to true
  panic: false,
  // The amount of time in ms the update loop will run. Is adjustable with setTimeStep().
  timeStep: 1000 / 60,
  // The time at the start of the last frame. This is used to track how much player time has passed from the last turn of the loop
  previousTimeMS: 0,
  // The amount of time that has passed since the last frame update. This is also used to calculate the delta of time we are into the next frame. 
  lastFrameMS: 0,
  /*
    Called once to start the gameloop. Accepts and calls a function for initialization.
  */
  init(fun) {
    if (typeof fun === 'function') {
      fun();
    }
    this.started = true;
    requestAnimationFrame(Gameloop.main.bind(this)); 
  },
  main(currentTimeMS) {
    /*
      This game loop uses a fix timestep of 1000/60 ms (or 60fps). This can be changed
      with the setTimeStep() function. Each turn of the loop we track how much time has passed
      since the last frame update. If it is equal to or greater than the timestep, then we 
      update the frame. Updating the frame at fixed intervals makes the code deterministic and
      will work the same way reguardless of hardware speed.

      Renerding the frame is decoupled from the fixed timestep update because rendering only
      draws a moment in time and doesn't care how much time has passed since the last draw. This
      allows the loop to be able to catch up to the player time (time that has advanced in real life) 
      if it falls behind by performing multiple fixed time updates without rendering to the screen.


                                       ***********************
                                    -- *  Real time passed   * <-  
                                   |   *  >= timestep        *   |
                                   |   ***********************   | 
                                   |                             |
      ************************      -> *********************** --      ******************
      *  Process User Input  * ------> *  Update Game State  * ------> *  Render Frame  *
      ************************         ***********************         ******************
                ^                                                              |
                |                                                              |
                |______________________________________________________________|

      
      A side-effect to this decoupling is that updating and rendering may not be in sync,forcing rendering
      to happen between two updates. Fortunately, because we're updating at a fixed timestep, we know
      exactly how far into the next frame we are with what is left over in lastFrameMS. We pass in the
      percentage into the next frame we are (lastFrameMS / timeStep), and can use that value to extrapolate
      the rendering of things for the current frame. This can cause bugs, such as collision detection not
      firing, but they will be corrected on the next frame.
    */

    var elapsedTimeMS = currentTimeMS - this.previousTimeMS;
    this.previousTimeMS = currentTimeMS;
    this.lastFrameMS += elapsedTimeMS;

    Begin();
    
    /*
      If the time since the last frame update is greater than or equal to the timestep, perform a frame update.
      Can run multiple times if we're still behind the player clock by a fixed timestep.
    */
    while (this.lastFrameMS >= this.timeStep) {

      /*
        If the simulation is 1 second behind the player time, set panic to true
      */
      if (this.lastFrameMS >= 1000) {
        this.panic = true;
      }

      Update(this.timeStep);
      this.lastFrameMS -= this.timeStep;
    }

    Render(this.lastFrameMS / this.timeStep);
    this.calculateFPS(elapsedTimeMS);

    End();
    
    this.panic = false;
    requestAnimationFrame(this.main.bind(this));
  }
};

var GameloopProto = {
  // requestAnimationFrame and cancelAnimationFrame polyfill (node or ie9)
  // https://github.com/underscorediscovery/realtime-multiplayer-in-html5
  requestAnimationFrame: typeof requestAnimationFrame === 'function' ? requestAnimationFrame : function() {
    var lastTimestamp = Date.now(),
        now,
        timeout;
    return function(callback) {
        now = Date.now();
        timeout = Math.max(0, Gameloop.timeStep - (now - lastTimestamp));
        lastTimestamp = now + timeout;
        return setTimeout(function() {
            callback(now + timeout);
        }, timeout);
    };
  },
  cancelAnimationFrame: typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout,
  setBegin(fun) {
    Begin = fun;
    return this;
  },
  setRender(fun) {
    Render = fun;
    return this;
  },
  setUpdate(fun) {
    Update = fun;
    return this;
  },
  setEnd(fun) {
    End = fun;
    return this;
  },
  setTimeStep(timeStep) {
    this.timeStep = timeStep;
    return this;
  },
  // Keeps track of the frames rendered. Resets to zero every second.
  fpsCounter: 0,
  // Keeps track of the time elapsed. Resets to zero every second.
  fpsTimeElapsed: 0,
  // The current fps. Is set every second.
  currentFPS: 0,
  // Calculates the amount of frames rendered each second.
  calculateFPS(elapsedTimeMS) {
    this.fpsTimeElapsed += elapsedTimeMS;
    if (this.fpsTimeElapsed >= 1000) {
      this.currentFPS = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTimeElapsed = 0;
    } else {
      this.fpsCounter++;
    }
  }
}

Object.setPrototypeOf(Gameloop, GameloopProto);

module.exports = Gameloop;