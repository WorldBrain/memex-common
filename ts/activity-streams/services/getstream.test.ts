import expect from "expect"
import { prepareActivitiesFromStreamIO } from "./getstream"

describe('Getstream.io integration', () => {
    it('should correctly translate activities received from Getstream.io', () => {
        const annotationData = {
            "body": "16.4 trillion: calls made to DynamoDB during 66 hours of Amazon's Prime day from Alexa, Amazon.com, and all Amazon fulfillment centers.",
            "comment": "",
            "createdWhen": 1606126556484,
            "normalizedPageUrl": "highscalability.com/blog/2020/11/6/stuff-the-internet-says-on-scalability-for-november-6th-2020.html",
            "updatedWhen": 1606126870817,
            "uploadedWhen": 1606126870817
        }
        expect(prepareActivitiesFromStreamIO([{
            activities: [{
                "actor": "user:n6pZC1WDeQYDmRdrpNBE6UwmlKZ2",
                "data_annotation": {
                    "id": "GNe8TuZn4OXLqDLvWqAj",
                    "collection": "sharedAnnotation",
                    "foreign_id": "sharedAnnotation:GNe8TuZn4OXLqDLvWqAj",
                    "data": annotationData,
                    "created_at": "2020-11-25T10:44:13.380949Z",
                    "updated_at": "2020-11-25T11:45:00.773054Z"
                },
                "data_normalizedPageUrl": "highscalability.com/blog/2020/11/6/stuff-the-internet-says-on-scalability-for-november-6th-2020.html",
                "foreign_id": "contentReply:l1wQJkYJYI7RCdiIpLQP",
                "id": "a67a4a8a-2f13-11eb-87f8-0a2bb302d5d9",
                "object": "sharedAnnotation:GNe8TuZn4OXLqDLvWqAj",
                "origin": "sharedAnnotation:GNe8TuZn4OXLqDLvWqAj",
                "target": "",
                "time": "2020-11-25T11:45:00.884852",
                "verb": "reply"
            }]
        }])).toEqual([{
            entityType: 'sharedAnnotation',
            entity: { type: 'shared-annotation-reference', id: 'GNe8TuZn4OXLqDLvWqAj' },
            activityType: 'reply',
            activities: [{
                activity: {
                    normalizedPageUrl: "highscalability.com/blog/2020/11/6/stuff-the-internet-says-on-scalability-for-november-6th-2020.html",
                    annotation: {
                        reference: { type: 'shared-annotation-reference', id: 'GNe8TuZn4OXLqDLvWqAj' },
                        ...annotationData,
                    }
                }
            }]
        }])
    })
})