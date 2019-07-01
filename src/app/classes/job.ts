
/**
 * A job consists of a series of steps.
 */

export class Execution {
    time: Date;
    executor: string;
    result: any;
}

export class Step {
    name: string;   //getCode
    executions: Execution[];
    maxConcurrentExecutions = 1;
}

export class Job {

    name: string;
    inputs: any[];
    // an executor is a piece of javascript code to execute (Promise)
    executor: string;

    // an exiter is a piece of javascript code to test if it should exit
    exiter: string;
    Jobs: Job[];
    
    executions: Execution[];


    // map out conditions to terminate??? step --> response




    private static _queue: Job[] = [];
    private static _running = false;
    static add(job: Job) {
        Job._queue.push(job);
        Job.resume();
    }
    static pause() {
        Job._running = false;
        // then let current job finish return
    }
    static resume() {
        if (Job._running) {
            return;
        }
        Job._running = true;
        // executing jobs here!
        while (true) {
            const nextJob = Job._queue;
            break;
        }
        Job._running = false;
    }
}
