const express=require('express');
const app=express();
const mongoose = require('mongoose');
const{User}=require('./model/User');
const morgan = require('morgan');
const cors=require('cors');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {Product}=require('./model/Product');
const{Cart}=require('./model/Cart');

//middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());



mongoose.connect('mongodb+srv://swadeshaundhkarbca:hbx0wHOM2Qq2f24u@cluster0.mkjjjda.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
.then(()=>{
    console.log("db is connected")
}).catch((error)=>{
    console.log("db is not connected",error)
})

//task-1 create route for register user
app.post('/register',async(req,res)=>{
    try{
        let{name,email,password}=req.body;

        //Check if any field missing
        if(!email||!name||!password){
            res.status(400).json({
                message:"Field is missing"
            })
        }
        // check if user already has an account
        const user=await User.findOne({email});

        if(user){
            return res.status(400).json({
                message:"User already has an account"
            });
        }else{
            //hash the password ->secure password
            const salt=bcrypt.genSaltSync(10);
            const hashedPassword=bcrypt.hashSync(password,salt);
            
            // user authentication
            const token=jwt.sign({email},"supersecret",{expiresIn:'365d'});

            //create user database
            await User.create({
                name,
                password:hashedPassword,
                email,
                token,
                role:'user'
            });
            return res.status(200).json({
                message:"user created succesfully"
            });
        }

    }catch(error){
        console.log(error);
        res.status(400).json({
            message:"Internal server error"
        });
    }
});

//task-2 create route for login
app.post('/login',async(req,res)=>{
    try{
        let{email,password}=req.body;

        //check if all fields are there or not
        if(!email||!password){
            return res.status(400).json({
                message:"Fiels is missing"
            });
        }
        //checking user having account
        const user=await User.findOne({email});
       
        if(!user){
            return res.status(400).json({
                message:"User not registered"
            });
        }
        //compare password with the stored password
        const isPasswordMatched=bcrypt.compareSync(password,user.password);

        if(!isPasswordMatched){
            return res.status(404).json({
                message:"Password is wrong"
            });
        }

        return res.status(200).json({
            message:"User loggedin successfully",
            id:user._id,
            name:user.name,
            token:user.token,
            email:user.email,
            role:user.role
        });
    }catch(error){
        console.log(error);
        res.status(400).json({
            message:"Internal server error"
        });
    }
});

//Task-3 create route to see all the products
app.get('/products',async(req,res)=>{
    try{
        //let {name,price,stock,brand,image,desc}
        const products=await Product.find();
        res.status(200).json({
            message:"Product found successfully",
            products:products
        })
    }catch(error){
        console.log(error);
        res.status(400).json({
            message:"Internal server error"
        })
    }
})

//task-4 create route to add product
app.post('/add-product',async(req,res)=>{
    try{
        let{name,image,description,stock,brand,price}=req.body;
        const {token}=req.headers;
        const decodedToken=jwt.verify(token,"supersecret");
        const user=await User.findOne({email:decodedToken.email})
        const product=await Product.create({
            name,
            stock,
            price,
            image,
            description,
            brand,
            user:user._id
        })
        return res.status(200).json({
            message:"product created successfully",
            product:product
        });
    }catch(error){
        console.log(error);
        res.status(400).json({
            message:"Internal server error"
        });
    }
});

//task-5 create route to see particular products
app.get('/product/edit/:id',async(req,res)=>{
    try{
        let{id}=req.params;
        if(!id){
            return res.status(400).json({
                message:"Product id not found"
            });
        }
        let {token}=req.headers;
        const decodedToken=jwt.verify(token,"supersecret");
        if(decodedToken.email){
            const product=await Product.findById(id);

            if(!product){
                res.status(400).json({
                    message:"Product not found"
                });
            }
        }
        return res.status(200).json({
            message:"Product found successfully",
            product
        })
    }catch(error){
        console.log(error);
        res.status(400).json({
            message:"Internal server error"
        })
    }
})

// Task-6: Create route to update a product
app.patch('/product/edit/:id', async (req, res) => {
    const { id } = req.params;
      const { name, price, stock, brand, description, image } = req.body.productData;
      const {token} = req.headers;
  
      // Verify token
      const decodedToken = jwt.verify(token, "supersecret");
  try {
      
      if (decodedToken.email) {
        const updatedproduct = await Product.findByIdAndUpdate(id, {
            name,
            brand,
            description,
            image,
            price,
            stock,
          }
        );
          res.status(200).json({
          message: "Product updated successfully",
          product: updatedproduct
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
});
  

//task-8 -> create route to see all products in cart
app.get('/cart',async(req,res)=>{
    try{
        let {token} = req.headers;
        let decodedToken = jwt.verify(token,"supersecret");
        const user = await User.findOne({email:decodedToken.email}).populate({
            path: 'cart',
            populate:{
                path:'products',
                model: "Product"
            }
        })
        if(!user){
            return res.status(400).json({
                message:"User not found"
            })
        }

        return res.status(200).json({
            cart:user.cart
        })
    }catch(error){
        console.log(error);
        res.status(400).json({message:"Internal Server error"})
    }
})

//task-9 -> create route to add-product in cart
app.post('/cart/add',async(req,res)=>{
    try{
        const body = req.body;
        //getting product id from frontend;
        const productArray = body.products;
        let totalPrice = 0;
        
        //find the product and add product price in total
        for(let item of productArray){
            const product = await Product.findById(item);
            if(product){
                totalPrice += product.price;
            }
        }

        //find the user
        let {token} = req.headers;
        let decodedToken = jwt.verify(token, "supersecret");
        const user = await User.findOne({email:decodedToken.email});

        if(!user){
            return res.status(400).json({
                message:"User not found"
            })
        }
        //checking if user Already has a cart
        let cart;
        if(user.cart){
            cart = await Cart.findById(user.cart).populate('products');
            //extracitng product IDS from the exisitng cart
            const existingProductIds = cart.products.map((product)=>{
                product._id.toString()
            })
            //looping through the newly added products
            //if product is not already in the cart add it to cart
            productArray.forEach(async(productId)=>{
                if(!existingProductIds.includes(productId)){
                    cart.products.push(productId);
                    const product = await Product.findById(productId);
                    totalPrice += product.price; 
                }
            })
            //updating cart total
            //saving the cart
            cart.total = totalPrice;
            await cart.save();
        }else{
            cart = new Cart({
                products:productArray,
                total:totalPrice
            })
            await cart.save();
            user.cart = cart._id;
            await user.save();
        }
        return res.status(200).json({
            message:"cart updated successfully",
            cart:cart
        })
    }catch(error){
        console.log(error);
        res.status(400).json({message:"Internal Server error"})
    }
})


//task-10 create route to delete-product in cart
app.delete('/cart/product/delete',async(req,res)=>{
    try{
        const {productID} = req.body;
        const {token} = req.headers;
        const decodedToken = jwt.verify(token,"supersecret");
        const user = await User.findOne({email:decodedToken.email}).populate('cart');
        if(!user){
            return res.status(400).json({
                message:"User not found"
            })
        }
        const cart = await Cart.findById(user.cart).populate('products');
        if(!cart){
            return res.status(400).json({
                message:"cart not found"
            })
        }
        //findIndex() searches for the product in cart
        const productIndex = cart.products.findIndex(
            (product) => product._id.toString() === productID
        );
        
        if(productIndex === -1){
            return res.status(404).json({
                message:"Product not found in cart"
            })
        }
        cart.products.splice(productIndex,1);
        cart.total = cart.products.reduce(
            (total, product) => total + product.price,
            0
        );
        await cart.save();
        return res.status(200).json({
            message:"Product removed from cart successfully",
            cart:cart
        })
    }catch(error){
        console.log(error);
        res.status(400).json({message:"Internal Server error"})
    }
})


let PORT=8080;
app.listen(PORT,()=>{
    console.log(`server is connected to port ${PORT}`)
})