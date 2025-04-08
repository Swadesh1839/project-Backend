const mongoose=require('mongoose');

const productSchema=new mongoose.Schema({
    name:{
        type:String
    },
    price:{
        type:Number
    },
        stock:
        {
            type:Number,
        },
        brand:
        {
            type:String
        },
        description:
        {
            type:String
        },
        image:
        {
            type:String,
        },
        user:
        {
            type:mongoose.Schema.ObjectId,
            ref:"User"
        }

})

const Product=mongoose.model('Product',productSchema);
module.exports={Product};