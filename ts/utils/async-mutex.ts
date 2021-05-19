import createResolvable, { Resolvable } from "@josephg/resolvable"

export class AsyncMutex {
    _currentJobs: Array<Resolvable<void>> = []
    _allJobs?: Resolvable<void>

    async lock(): Promise<{ releaseMutex: () => void }> {
        const precedingJob = this._currentJobs.slice(-1)[0]
        const currentJob = createResolvable()
        this._currentJobs.push(currentJob)

        await precedingJob
        if (!this._allJobs) {
            this._allJobs = createResolvable()
        }

        return {
            releaseMutex: () => {
                this._currentJobs.shift()
                const noMoreWaiting = !this._currentJobs.length
                currentJob.resolve()
                if (noMoreWaiting) {
                    const allJobs = this._allJobs
                    delete this._allJobs
                    allJobs.resolve()
                }
            }
        }
    }

    async wait() {
        await this._allJobs
    }
}
