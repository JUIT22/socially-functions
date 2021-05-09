class Node {
    constructor(data) {
        this.data = data
        this.next = null
    }
}

class Queue {
    constructor() {
        this.front = null;
        this.rear = null;
    }
    push(data){
        let a = new Node(data);
        if(this.front==null && this.rear==null) {
            this.front=a;
            this.rear=a;
        }
        else {
            this.rear.next = a;
            this.rear = a;
        }
    }
    pop(){
        if(this.empty()) return "Underflow";
        let item = this.front.data;
        this.front = this.front.next;
        if(this.front==null) this.rear=null;
        return item;
    }
    empty(){ 
        return this.front==null && this.rear==null;
    }
}

module.exports = { Queue };