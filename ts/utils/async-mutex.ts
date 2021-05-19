import createResolvable, { Resolvable } from "@josephg/resolvable"

export class AsyncMutex {
    waitingCount = 0
    _currentJob?: Resolvable<void>
    _allJobs?: Resolvable<void>

    async lock(): Promise<{ releaseMutex: () => void }> {
        this.waitingCount += 1
        await this._currentJob
        this.waitingCount -= 1

        const currentJob = this._currentJob = createResolvable()
        if (!this._allJobs) {
            this._allJobs = createResolvable()
        }

        return {
            releaseMutex: () => {
                delete this._currentJob
                const noMoreWaiting = !this.waitingCount
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
