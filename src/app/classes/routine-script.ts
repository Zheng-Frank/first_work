
export class RoutineScript {
    name: string;
    waitSecondsBetweenRuns: number;
    waitSecondsBetweenUows?: number;
    unitOfWorksGeneratorName: string;
    parallelProcessors: number;
    disabled?: boolean;
    uowsHistory?: any;
}
