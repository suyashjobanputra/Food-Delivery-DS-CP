# Food Delivery Time & Customer Satisfaction Analytics
# R component: data cleaning, descriptive statistics, EDA, visualization, regression

df <- read.csv("food_delivery_prototype_cleaned.csv")

# Basic structure
str(df)
summary(df)

# Descriptive statistics
mean(df$actual_delivery_min, na.rm=TRUE)
median(df$actual_delivery_min, na.rm=TRUE)
sd(df$actual_delivery_min, na.rm=TRUE)
quantile(df$actual_delivery_min, probs=c(0.25,0.5,0.75), na.rm=TRUE)

# Correlation
cor(df$actual_delivery_min, df$customer_rating, use="complete.obs")

# Histogram
hist(df$actual_delivery_min,
     main="Distribution of Delivery Time",
     xlab="Delivery Time (minutes)")

# Box plot
boxplot(df$actual_delivery_min,
        main="Delivery Time - Outlier Analysis",
        ylab="Minutes")

# Scatter plot
plot(df$distance_km, df$actual_delivery_min,
     main="Distance vs Delivery Time",
     xlab="Distance (km)",
     ylab="Delivery Time (minutes)")

# Customer rating vs delivery time
plot(df$actual_delivery_min, df$customer_rating,
     main="Delivery Time vs Customer Rating",
     xlab="Delivery Time (minutes)",
     ylab="Customer Rating")

# Multiple linear regression
model <- lm(actual_delivery_min ~ distance_km +
              preparation_time_min +
              number_of_items +
              restaurant_rating +
              courier_rating +
              estimated_delivery_min +
              hour,
            data=df)

summary(model)

# Average rating by delivery-time category
df$delivery_band <- cut(
  df$actual_delivery_min,
  breaks=c(0,30,45,60,Inf),
  labels=c("<=30","31-45","46-60",">60")
)

aggregate(customer_rating ~ delivery_band,
          data=df,
          FUN=function(x) mean(x, na.rm=TRUE))
